'use client'

import { AxiosError } from 'axios'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { useQueryClient } from 'react-query'

import { MediaAssetModel, MediaResourceType } from '~/api/media'
import { ImageLoader } from '~/components/Containers'
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui'
import { Input } from '~/components/ui/input'
import { formatDataSizeShort, formatMediaUploadMaxLabel, isMediaFileWithinUploadLimit } from '~/constants/media-upload'
import { useLocale, useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { useDeleteMediaMutation, useMediaAssetsQuery, useUploadMediaMutation } from '~/query/media'

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

  const audioPreviewSrc =
    value && resourceType === MediaResourceType.AUDIO
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
          ) : value?.includes('cdn') && !value?.includes('http') ? (
            <>
              {resourceType === MediaResourceType.VIDEO ? (
                <video className="w-full max-w-md" controls preload="metadata" src={value} />
              ) : (
                <Image
                  src={`${window?.location?.origin ?? ''}${value}`}
                  alt="Media"
                  width={100}
                  height={100}
                  className="w-full h-full max-w-40 max-h-40 object-contain"
                  unoptimized
                />
              )}
            </>
          ) : (
            <ImageLoader src={value} className="w-full h-full max-w-40 max-h-40 object-contain" />
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
        <p className="mt-2 text-xs text-muted-foreground">{helperText}</p>
      </div>
      <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>{t('media.ui.mediaLibrary')}</DialogTitle>
            <DialogDescription>{t('media.ui.mediaLibraryDescription')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
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
                <Button type="button" variant="secondary" size="sm-md" disabled={disabled || isBusy} onClick={() => modalFileInputRef.current?.click()}>
                  {t('common.upload')}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{helperText}</p>
            </div>
            <div className="max-h-[420px] overflow-y-auto rounded-md border p-3">
              {mediaAssetsQuery.isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
              {mediaAssetsQuery.isError && <p className="text-sm text-destructive">{t('media.errors.failedToLoadMediaList')}</p>}
              {!mediaAssetsQuery.isLoading && !mediaAssetsQuery.isError && !mediaAssetsQuery.data?.items?.length && (
                <p className="text-sm text-muted-foreground">{t('media.errors.noMediaFoundYet')}</p>
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
                          <span className="px-2 text-center text-xs text-muted-foreground">{asset.originalFilename ?? asset.id}</span>
                        )}
                      </div>
                      <span className="line-clamp-2 text-xs text-muted-foreground">{asset.originalFilename ?? asset.id}</span>
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
