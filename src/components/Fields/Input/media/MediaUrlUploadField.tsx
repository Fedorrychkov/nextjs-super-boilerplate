'use client'

import { AxiosError } from 'axios'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useQueryClient } from 'react-query'

import { ClientLlmApi } from '~/api/llm'
import { MediaAssetModel, MediaResourceType } from '~/api/media'
import { ImageLoader } from '~/components/Containers'
import { MultiselectField } from '~/components/Fields/Input/MultiselectField'
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Textarea, Typography } from '~/components/ui'
import { Input } from '~/components/ui/input'
import { formatDataSizeShort, formatMediaUploadMaxLabel, isMediaFileWithinUploadLimit } from '~/constants/media-upload'
import { useLocale, useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { useLlmModelsQuery } from '~/query/llm'
import { buildLlmArticleUsageQueryKey } from '~/query/llm/query/useLlmArticleUsageQuery'
import { useDeleteMediaMutation, useMediaAssetsQuery, useUploadMediaMutation } from '~/query/media'
import { parseLlmSseStream } from '~/utils/parseLlmSseStream'

import {
  DEFAULT_AUDIO_ACCEPT_MIME_TYPES,
  DEFAULT_DOCUMENT_ACCEPT_MIME_TYPES,
  DEFAULT_IMAGE_ACCEPT_MIME_TYPES,
  DEFAULT_VIDEO_ACCEPT_MIME_TYPES,
} from './constants'

export type MediaUrlUploadToolbarRenderProps = {
  disabled: boolean
  isBusy: boolean
  canRemove: boolean
  assetId: string | null | undefined
  value: string
  openLibrary: () => void
  /** Triggers the hidden file input on the main card (upload without opening the library modal first). */
  pickLocalFile: () => void
  remove: () => void
}

type Props = {
  label: string
  value: string
  assetId?: string | null
  disabled?: boolean
  hintText?: string
  resourceType?: MediaResourceType
  variant?: 'inline' | 'thumb' | 'seo' | 'original'
  acceptedMimeTypes?: string[]
  mediaListLimit?: number
  /** With `articleRevisionId`, enables AI image generation inside the media library (when `NEXT_PUBLIC_LLM_ENABLED`). */
  articleId?: string | null
  articleRevisionId?: string | null
  /** Extra busy state from the parent (e.g. article save or TTS generation). */
  toolbarBusy?: boolean
  /** When true, the URL field is read-only; value changes only via library / file / parent logic. */
  urlInputReadOnly?: boolean
  /** Replaces the default «Upload» (library) + «Remove» row with custom actions. */
  renderToolbar?: (ctx: MediaUrlUploadToolbarRenderProps) => ReactNode
  onChange: (next: { value: string; removed?: boolean; assetId?: string | null; asset?: MediaAssetModel | null }) => void
}

export const MediaUrlUploadField = (props: Props) => {
  const t = useT()
  const locale = useLocale()
  const queryClient = useQueryClient()
  const {
    label,
    value,
    assetId,
    disabled,
    hintText,
    resourceType = MediaResourceType.IMAGE,
    variant = 'inline',
    acceptedMimeTypes: acceptedMimeTypesProps = DEFAULT_IMAGE_ACCEPT_MIME_TYPES,
    mediaListLimit = 60,
    articleId = null,
    articleRevisionId,
    toolbarBusy = false,
    urlInputReadOnly = false,
    renderToolbar,
    onChange,
  } = props

  const acceptedMimeTypes = useMemo(() => {
    if (resourceType === MediaResourceType.IMAGE) {
      return DEFAULT_IMAGE_ACCEPT_MIME_TYPES
    }

    if (resourceType === MediaResourceType.VIDEO) {
      return DEFAULT_VIDEO_ACCEPT_MIME_TYPES
    }

    if (resourceType === MediaResourceType.AUDIO) {
      return DEFAULT_AUDIO_ACCEPT_MIME_TYPES
    }

    if (resourceType === MediaResourceType.DOCUMENT) {
      return DEFAULT_DOCUMENT_ACCEPT_MIME_TYPES
    }

    return acceptedMimeTypesProps
  }, [resourceType, acceptedMimeTypesProps])

  const modalFileInputRef = useRef<HTMLInputElement>(null)
  const mainFileInputId = useId()
  const [isDragging, setIsDragging] = useState(false)
  const [isModalDragging, setIsModalDragging] = useState(false)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const { notify } = useNotify()
  const { uploadMediaMutation } = useUploadMediaMutation()
  const { deleteMediaMutation } = useDeleteMediaMutation()

  const llmUiEnabled = process.env.NEXT_PUBLIC_LLM_ENABLED === 'true'
  const showAiImagePanel = resourceType === MediaResourceType.IMAGE && llmUiEnabled && Boolean(articleId?.trim()) && Boolean(articleRevisionId?.trim())

  const llmModelsQuery = useLlmModelsQuery(showAiImagePanel && isLibraryOpen)

  const imageModels = useMemo(() => llmModelsQuery.data?.image?.models ?? [], [llmModelsQuery.data?.image?.models])

  const [aiPrompt, setAiPrompt] = useState('')
  const [aiPromptSource, setAiPromptSource] = useState<'custom' | 'fromArticle'>('custom')
  const [aiImageModelId, setAiImageModelId] = useState('')
  const [aiAspectId, setAiAspectId] = useState('16:9')
  const [aiSuggestBusy, setAiSuggestBusy] = useState(false)
  const [aiGenerateBusy, setAiGenerateBusy] = useState(false)
  const [aiStreamPreviewUrl, setAiStreamPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!isLibraryOpen) {
      setAiStreamPreviewUrl(null)
    }
  }, [isLibraryOpen])

  useEffect(() => {
    if (!imageModels.length) {
      return
    }

    setAiImageModelId((prev) => {
      if (prev && imageModels.some((m) => m.id === prev)) {
        return prev
      }

      return imageModels[0].id
    })
  }, [imageModels])

  const selectedImageModel = useMemo(() => imageModels.find((m) => m.id === aiImageModelId) ?? imageModels[0], [aiImageModelId, imageModels])

  useEffect(() => {
    if (!selectedImageModel) {
      return
    }

    setAiAspectId((prev) => {
      if (selectedImageModel.aspectRatios.some((a) => a.id === prev)) {
        return prev
      }

      return selectedImageModel.defaultAspectRatioId
    })
  }, [selectedImageModel])
  const mediaAssetsQuery = useMediaAssetsQuery({
    resourceType,
    limit: mediaListLimit,
    enabled: isLibraryOpen,
  })

  const isBusy = uploadMediaMutation.isLoading || deleteMediaMutation.isLoading || toolbarBusy
  const canRemove = Boolean(value || assetId)
  const acceptedMimeTypesString = useMemo(() => acceptedMimeTypes.join(','), [acceptedMimeTypes])

  const getAssetPreviewUrl = useCallback(
    (asset: MediaAssetModel) => {
      if (resourceType === MediaResourceType.IMAGE) {
        return `${asset.proxyPath}/${variant}`
      }

      return asset.proxyPath
    },
    [resourceType, variant],
  )

  const maxUploadLabel = useMemo(() => formatMediaUploadMaxLabel(locale), [locale])

  const handleUploadFile = useCallback(
    async (file: File) => {
      if (!isMediaFileWithinUploadLimit(file)) {
        notify(
          t('media.errors.fileExceedsMaxSize', {
            size: formatDataSizeShort(file.size, locale),
            maxLabel: maxUploadLabel,
          }),
          'destructive',
        )

        return
      }

      try {
        const uploaded = await uploadMediaMutation.mutateAsync({ file, resourceType })
        const nextValue = resourceType === MediaResourceType.IMAGE ? `${uploaded.asset.proxyPath.replace(/\/$/, '')}/${variant}` : uploaded.asset.proxyPath

        onChange({ value: nextValue, assetId: uploaded.asset.id, asset: uploaded.asset })
        await queryClient.invalidateQueries('media-assets')
        notify(t('media.messages.fileUploaded'), 'success')
        setIsLibraryOpen(false)
      } catch (error) {
        const message =
          error instanceof AxiosError && error.response?.data && typeof error.response.data === 'object' && 'message' in error.response.data
            ? String((error.response.data as { message?: unknown }).message ?? '')
            : ''

        notify(message || t('media.errors.failedToUploadFile'), 'destructive')
      }
    },
    [locale, maxUploadLabel, notify, onChange, queryClient, t, resourceType, uploadMediaMutation, variant, setIsLibraryOpen],
  )

  const handleRemove = useCallback(async () => {
    try {
      if (assetId) {
        await deleteMediaMutation.mutateAsync({ assetId, articleRevisionId: articleRevisionId ?? undefined })

        onChange({ value: '', assetId: null, asset: null, removed: true })
        await queryClient.invalidateQueries('media-assets')

        notify(t('media.messages.fileRemoved'), 'success')
      } else {
        onChange({ value: '', assetId: null, asset: null, removed: true })
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        notify(error.response?.data?.reason ?? t('media.errors.failedToRemoveFile'), 'destructive')

        return
      }

      notify(t('media.errors.failedToRemoveFile'), 'destructive')
    }
  }, [assetId, articleRevisionId, deleteMediaMutation, onChange, notify, queryClient, t])

  const handleSelectFromLibrary = useCallback(
    (asset: MediaAssetModel) => {
      onChange({
        value: getAssetPreviewUrl(asset),
        assetId: asset.id,
        asset,
      })
      setIsLibraryOpen(false)
    },
    [getAssetPreviewUrl, onChange],
  )

  const handleModalDropUpload = useCallback(
    (file: File) => {
      void handleUploadFile(file)
    },
    [handleUploadFile],
  )

  const helperText = useMemo(() => {
    const sizeHint = t('media.ui.uploadMaxFileSizeHint', { maxLabel: maxUploadLabel })
    const base = hintText ? hintText : resourceType === MediaResourceType.IMAGE ? t('media.ui.uploadImageFileHintText') : t('media.ui.uploadFileHintText')

    return `${base} ${sizeHint}`
  }, [hintText, maxUploadLabel, resourceType, t])

  const openLibrary = useCallback(() => setIsLibraryOpen(true), [])
  const pickLocalFile = useCallback(() => {
    document.getElementById(mainFileInputId)?.click()
  }, [mainFileInputId])

  type ImagePromptSse = { type?: string; text?: string; message?: string }

  const handleAiSuggestPrompt = useCallback(async () => {
    const aid = articleId?.trim()
    const rid = articleRevisionId?.trim()

    if (!aid || !rid || aiSuggestBusy || !llmModelsQuery.data?.enabled) {
      return
    }

    const chatModel = llmModelsQuery.data.chat.models[0]?.id

    if (!chatModel) {
      notify(t('article.errors.llmNotConfigured'), 'destructive')

      return
    }

    setAiSuggestBusy(true)
    setAiPrompt('')

    let acc = ''

    try {
      const api = new ClientLlmApi()
      const res = await api.postImagePromptStream({
        articleId: aid,
        revisionId: rid,
        model: chatModel,
      })

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { message?: string }

        throw new Error(errBody.message || res.statusText)
      }

      await parseLlmSseStream<ImagePromptSse>(res, (ev) => {
        if (ev.type === 'delta' && typeof ev.text === 'string') {
          acc += ev.text
          setAiPrompt(acc)
        }

        if (ev.type === 'error' && typeof ev.message === 'string') {
          notify(ev.message, 'destructive')
        }
      })

      void queryClient.invalidateQueries(buildLlmArticleUsageQueryKey({ articleId: aid, revisionId: rid }))
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.unknown')

      notify(message, 'destructive')
    } finally {
      setAiSuggestBusy(false)
    }
  }, [aiSuggestBusy, articleId, articleRevisionId, llmModelsQuery.data, notify, queryClient, t])

  type ImageGenSse =
    | { type: 'start'; requestId?: string }
    | { type: 'partial'; b64?: string; mime?: string; index?: number }
    | {
        type: 'done'
        asset?: MediaAssetModel
        proxyUrl?: string
      }
    | { type: 'error'; message?: string }

  const handleAiGenerateImage = useCallback(async () => {
    const aid = articleId?.trim()
    const rid = articleRevisionId?.trim()

    if (!aid || !rid || !selectedImageModel) {
      return
    }

    if (aiPromptSource === 'custom' && !aiPrompt.trim()) {
      notify(t('article.errors.llmImagePromptRequired'), 'destructive')

      return
    }

    setAiStreamPreviewUrl(null)
    setAiGenerateBusy(true)

    try {
      const api = new ClientLlmApi()
      const res = await api.postImageGenerateStream({
        articleId: aid,
        revisionId: rid,
        imageModel: selectedImageModel.id,
        aspectRatioId: aiAspectId,
        promptSource: aiPromptSource,
        ...(aiPromptSource === 'custom' ? { prompt: aiPrompt.trim() } : {}),
      })

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { message?: string }

        throw new Error(errBody.message || res.statusText)
      }

      let finished = false

      await parseLlmSseStream<ImageGenSse>(res, (ev) => {
        if (ev.type === 'partial' && typeof ev.b64 === 'string' && typeof ev.mime === 'string') {
          setAiStreamPreviewUrl(`data:${ev.mime};base64,${ev.b64}`)
        }

        if (ev.type === 'done' && ev.asset && typeof ev.proxyUrl === 'string') {
          finished = true
          const nextValue = `${ev.proxyUrl.replace(/\/$/, '')}/${variant}`

          onChange({ value: nextValue, assetId: ev.asset.id, asset: ev.asset })
        }

        if (ev.type === 'error' && typeof ev.message === 'string') {
          notify(ev.message, 'destructive')
        }
      })

      if (finished) {
        await queryClient.invalidateQueries('media-assets')
        void queryClient.invalidateQueries(buildLlmArticleUsageQueryKey({ articleId: aid, revisionId: rid }))
        notify(t('media.ui.aiImageGenerated'), 'success')
        setIsLibraryOpen(false)
      }
    } catch (error) {
      const message =
        error instanceof AxiosError && error.response?.data && typeof error.response.data === 'object' && 'message' in error.response.data
          ? String((error.response.data as { message?: unknown }).message ?? '')
          : error instanceof Error
            ? error.message
            : ''

      notify(message || t('media.errors.failedToUploadFile'), 'destructive')
    } finally {
      setAiGenerateBusy(false)
    }
  }, [aiAspectId, aiPrompt, aiPromptSource, articleId, articleRevisionId, notify, onChange, queryClient, selectedImageModel, t, variant])

  const aiModalBusy = aiSuggestBusy || aiGenerateBusy

  const audioPreviewSrc =
    value && resourceType === MediaResourceType.AUDIO
      ? value.startsWith('http')
        ? value
        : `${typeof window !== 'undefined' ? window.location.origin : ''}${value.startsWith('/') ? value : `/${value}`}`
      : ''

  /** Same resolution as audio: absolute URL as-is, site-relative path joined with origin. */
  const videoPreviewSrc =
    value && resourceType === MediaResourceType.VIDEO
      ? value.startsWith('http')
        ? value
        : `${typeof window !== 'undefined' ? window.location.origin : ''}${value.startsWith('/') ? value : `/${value}`}`
      : ''

  return (
    <div className="flex flex-col gap-2">
      <Input
        label={label}
        value={value}
        onChange={(next) => onChange({ value: next, assetId })}
        disabled={disabled || isBusy}
        readOnly={urlInputReadOnly}
        placeholder="https://... or /cdn/..."
      />
      {!!value && (
        <div className="flex flex-row gap-2">
          {resourceType === MediaResourceType.AUDIO ? (
            <audio className="h-10 w-full max-w-md" controls preload="metadata" src={audioPreviewSrc || undefined} />
          ) : resourceType === MediaResourceType.VIDEO ? (
            <video className="w-full max-w-md" controls preload="metadata" src={videoPreviewSrc || undefined} />
          ) : (
            <ImageLoader src={value} alt="Media" className="w-full h-full max-w-40 max-h-40 object-contain" />
          )}
        </div>
      )}
      <div
        className={`rounded-md border p-2 ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}`}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          const file = event.dataTransfer.files?.[0]

          if (file) {
            void handleUploadFile(file)
          }
        }}
        onPaste={(event) => {
          const file = event.clipboardData.files?.[0]

          if (file) {
            event.preventDefault()

            void handleUploadFile(file)
          }
        }}
      >
        {/* eslint-disable-next-line no-restricted-syntax -- hidden programmatic file trigger, not a text field */}
        <input
          id={mainFileInputId}
          type="file"
          className="hidden"
          accept={acceptedMimeTypesString}
          onChange={(event) => {
            const file = event.target.files?.[0]

            if (file) {
              void handleUploadFile(file)
            }

            event.currentTarget.value = ''
          }}
        />
        <div className="flex flex-row flex-wrap gap-2">
          {renderToolbar ? (
            renderToolbar({
              disabled: Boolean(disabled),
              isBusy,
              canRemove,
              assetId,
              value,
              openLibrary,
              pickLocalFile,
              remove: () => void handleRemove(),
            })
          ) : (
            <>
              <Button type="button" variant="secondary" size="sm-md" disabled={disabled || isBusy} onClick={openLibrary}>
                {t('common.upload')}
              </Button>
              {assetId && (
                <Button type="button" variant="outline" size="sm-md" disabled={disabled || isBusy || !canRemove} onClick={() => void handleRemove()}>
                  {t('common.remove')}
                </Button>
              )}
            </>
          )}
        </div>
        <Typography className="mt-2 text-xs text-muted-foreground">{helperText}</Typography>
      </div>
      <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>{t('media.ui.mediaLibrary')}</DialogTitle>
            <DialogDescription>{t('media.ui.mediaLibraryDescription')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {/* eslint-disable-next-line no-restricted-syntax -- hidden programmatic file trigger, not a text field */}
            <input
              ref={modalFileInputRef}
              type="file"
              className="hidden"
              accept={acceptedMimeTypesString}
              onChange={(event) => {
                const file = event.target.files?.[0]

                if (file) {
                  void handleUploadFile(file)
                }

                event.currentTarget.value = ''
              }}
            />
            <div
              className={`rounded-md border p-3 ${isModalDragging ? 'border-primary bg-primary/5' : 'border-border'}`}
              onDragOver={(event) => {
                event.preventDefault()
                setIsModalDragging(true)
              }}
              onDragLeave={() => setIsModalDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setIsModalDragging(false)
                const file = event.dataTransfer.files?.[0]

                if (file) {
                  handleModalDropUpload(file)
                }
              }}
              onPaste={(event) => {
                const file = event.clipboardData.files?.[0]

                if (file) {
                  event.preventDefault()
                  handleModalDropUpload(file)
                }
              }}
            >
              <div className="flex flex-row gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm-md"
                  disabled={disabled || isBusy || aiModalBusy}
                  onClick={() => modalFileInputRef.current?.click()}
                >
                  {t('common.upload')}
                </Button>
              </div>
              <Typography className="mt-2 text-xs text-muted-foreground">{helperText}</Typography>
            </div>
            {showAiImagePanel ? (
              <div className="rounded-md border border-dashed border-primary/30 bg-muted/20 p-3">
                <Typography variant="Body/S/Semibold" className="mb-2">
                  {t('media.ui.aiImageGenerateTitle')}
                </Typography>
                {llmModelsQuery.isLoading ? (
                  <Typography className="text-xs text-muted-foreground">{t('common.loading')}</Typography>
                ) : llmModelsQuery.isError ? (
                  <Typography className="text-xs text-destructive">{t('errors.unknown')}</Typography>
                ) : !llmModelsQuery.data?.enabled ? (
                  <Typography className="text-xs text-muted-foreground">{t('article.errors.llmNotConfigured')}</Typography>
                ) : !imageModels.length ? (
                  <Typography className="text-xs text-muted-foreground">{t('media.ui.aiImageNoModels')}</Typography>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <Typography asTag="span" className="text-xs font-medium text-foreground">
                        {t('media.ui.aiImagePromptSource')}
                      </Typography>
                      <div className="flex flex-row flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm-md"
                          variant={aiPromptSource === 'custom' ? 'default' : 'secondary'}
                          disabled={disabled || aiModalBusy}
                          onClick={() => setAiPromptSource('custom')}
                        >
                          {t('media.ui.aiImagePromptCustom')}
                        </Button>
                        <Button
                          type="button"
                          size="sm-md"
                          variant={aiPromptSource === 'fromArticle' ? 'default' : 'secondary'}
                          disabled={disabled || aiModalBusy}
                          onClick={() => setAiPromptSource('fromArticle')}
                        >
                          {t('media.ui.aiImagePromptFromArticle')}
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MultiselectField
                        label={t('media.ui.aiImageModel')}
                        updateBySelected
                        disabled={disabled || aiModalBusy}
                        value={imageModels.map((m) => ({ value: m.id, label: m.label })).find((o) => o.value === (selectedImageModel?.id ?? '')) ?? null}
                        onChange={(opts) => setAiImageModelId(opts[0]?.value ?? '')}
                        options={imageModels.map((m) => ({ value: m.id, label: m.label }))}
                      />
                      <MultiselectField
                        label={t('media.ui.aiImageAspect')}
                        updateBySelected
                        disabled={disabled || aiModalBusy || !selectedImageModel}
                        value={
                          (selectedImageModel?.aspectRatios ?? []).map((a) => ({ value: a.id, label: a.label })).find((o) => o.value === aiAspectId) ?? null
                        }
                        onChange={(opts) => setAiAspectId(opts[0]?.value ?? '')}
                        options={(selectedImageModel?.aspectRatios ?? []).map((a) => ({ value: a.id, label: a.label }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Typography asTag="span" className="text-xs font-medium">
                        {t('media.ui.aiImagePrompt')}
                      </Typography>
                      <Textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        rows={4}
                        disabled={disabled || aiModalBusy}
                        placeholder={t('media.ui.aiImagePromptPlaceholder')}
                        className="text-sm"
                      />
                      {aiPromptSource === 'fromArticle' ? (
                        <Typography className="text-xs text-muted-foreground">{t('media.ui.aiImageFromArticleFieldHint')}</Typography>
                      ) : null}
                      <div className="flex flex-row flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm-md" disabled={disabled || aiModalBusy} onClick={() => void handleAiSuggestPrompt()}>
                          {aiSuggestBusy ? t('media.ui.aiImageSuggestBusy') : t('media.ui.aiImageSuggestPrompt')}
                        </Button>
                      </div>
                      <Typography className="text-xs text-muted-foreground">{t('media.ui.aiImageSuggestHint')}</Typography>
                    </div>
                    {aiStreamPreviewUrl || aiGenerateBusy ? (
                      <div className="rounded-md border bg-muted/30 p-2">
                        <Typography asTag="span" className="text-xs font-medium text-muted-foreground">
                          {t('media.ui.aiImageStreamPreview')}
                        </Typography>
                        <div className="relative mt-1 flex min-h-[100px] max-h-56 items-center justify-center overflow-hidden rounded bg-background">
                          {aiStreamPreviewUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- data URL from OpenAI partial stream
                            <img src={aiStreamPreviewUrl} alt="" className="max-h-56 w-full object-contain" />
                          ) : null}
                          {aiGenerateBusy && !aiStreamPreviewUrl ? (
                            <Typography
                              asTag="span"
                              className="absolute inset-0 flex items-center justify-center bg-background/60 px-2 text-center text-xs text-muted-foreground"
                            >
                              {t('media.ui.aiImageStreamWaitingPartial')}
                            </Typography>
                          ) : null}
                          {aiGenerateBusy && aiStreamPreviewUrl ? (
                            <Typography
                              asTag="span"
                              className="absolute bottom-1 right-1 rounded bg-background/85 px-1.5 py-0.5 text-[10px] text-muted-foreground shadow"
                            >
                              {t('media.ui.aiImageStreamRefining')}
                            </Typography>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    <Button type="button" size="sm-md" disabled={disabled || aiModalBusy} onClick={() => void handleAiGenerateImage()}>
                      {aiGenerateBusy ? t('media.ui.aiImageGenerateBusy') : t('media.ui.aiImageGenerate')}
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
            <div className="max-h-[420px] overflow-y-auto rounded-md border p-3">
              {mediaAssetsQuery.isLoading && <Typography className="text-sm text-muted-foreground">{t('common.loading')}</Typography>}
              {mediaAssetsQuery.isError && <Typography className="text-sm text-destructive">{t('media.errors.failedToLoadMediaList')}</Typography>}
              {!mediaAssetsQuery.isLoading && !mediaAssetsQuery.isError && !mediaAssetsQuery.data?.items?.length && (
                <Typography className="text-sm text-muted-foreground">{t('media.errors.noMediaFoundYet')}</Typography>
              )}
              {!mediaAssetsQuery.isLoading && !mediaAssetsQuery.isError && !!mediaAssetsQuery.data?.items?.length && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {mediaAssetsQuery.data.items.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => handleSelectFromLibrary(asset)}
                      className="flex cursor-pointer flex-col gap-2 rounded-md border p-2 text-left transition-colors hover:bg-accent"
                    >
                      <div className="flex h-24 items-center justify-center overflow-hidden rounded bg-muted/40">
                        {asset.resourceType === MediaResourceType.IMAGE ? (
                          <ImageLoader src={getAssetPreviewUrl(asset)} className="w-full h-full object-contain" />
                        ) : (
                          <Typography asTag="span" className="px-2 text-center text-xs text-muted-foreground">
                            {asset.originalFilename ?? asset.id}
                          </Typography>
                        )}
                      </div>
                      <Typography asTag="span" className="line-clamp-2 text-xs text-muted-foreground">
                        {asset.originalFilename ?? asset.id}
                      </Typography>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
