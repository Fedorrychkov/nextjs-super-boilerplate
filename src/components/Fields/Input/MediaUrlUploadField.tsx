'use client'

import { AxiosError } from 'axios'
import Image from 'next/image'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useQueryClient } from 'react-query'

import { MediaAssetModel, MediaResourceType } from '~/api/media'
import { ImageLoader } from '~/components/Containers'
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '~/components/ui'
import { Input } from '~/components/ui/input'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { useDeleteMediaMutation, useMediaAssetsQuery, useUploadMediaMutation } from '~/query/media'

const DEFAULT_IMAGE_ACCEPT_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif']

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
  onChange: (next: { value: string; removed?: boolean; assetId?: string | null; asset?: MediaAssetModel | null }) => void
}

export const MediaUrlUploadField = (props: Props) => {
  const t = useT()
  const queryClient = useQueryClient()
  const {
    label,
    value,
    assetId,
    disabled,
    hintText,
    resourceType = MediaResourceType.IMAGE,
    variant = 'inline',
    acceptedMimeTypes = DEFAULT_IMAGE_ACCEPT_MIME_TYPES,
    mediaListLimit = 60,
    articleRevisionId,
    onChange,
  } = props

  const modalFileInputRef = useRef<HTMLInputElement>(null)
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

  const isBusy = uploadMediaMutation.isLoading || deleteMediaMutation.isLoading
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

  const handleUploadFile = useCallback(
    async (file: File) => {
      try {
        const uploaded = await uploadMediaMutation.mutateAsync({ file, resourceType })

        onChange({ value: `${uploaded.proxyUrl}/${variant}`, assetId: uploaded.asset.id, asset: uploaded.asset })
        await queryClient.invalidateQueries('media-assets')
        notify(t('media.messages.fileUploaded'), 'success')
      } catch (_error) {
        notify(t('media.errors.failedToUploadFile'), 'destructive')
      }
    },
    [notify, onChange, queryClient, t, resourceType, uploadMediaMutation, variant],
  )

  const handleRemove = useCallback(async () => {
    try {
      if (assetId) {
        await deleteMediaMutation.mutateAsync({ assetId, articleRevisionId: articleRevisionId ?? undefined })

        onChange({ value: '', assetId: null, asset: null, removed: true })
        await queryClient.invalidateQueries('media-assets')

        notify(t('media.messages.fileRemoved'), 'success')
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
    if (hintText) {
      return hintText
    }

    if (resourceType === MediaResourceType.IMAGE) {
      return t('media.ui.uploadImageFileHintText')
    }

    return t('media.ui.uploadFileHintText')
  }, [hintText, resourceType, t])

  return (
    <div className="flex flex-col gap-2">
      <Input
        label={label}
        value={value}
        onChange={(next) => onChange({ value: next, assetId })}
        disabled={disabled || isBusy}
        placeholder="https://... or /cdn/..."
      />
      {!!value && (
        <div className="flex flex-row gap-2">
          {value?.includes('cdn') && !value?.includes('http') ? (
            <Image
              src={`${window?.location?.origin ?? ''}${value}`}
              alt="Media"
              width={100}
              height={100}
              className="w-full h-full max-w-40 max-h-40 object-contain"
              unoptimized
            />
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
        <div className="flex flex-row gap-2">
          <Button type="button" variant="secondary" size="sm-md" disabled={disabled || isBusy} onClick={() => setIsLibraryOpen(true)}>
            {t('common.upload')}
          </Button>
          {assetId && (
            <Button type="button" variant="outline" size="sm-md" disabled={disabled || isBusy || !canRemove} onClick={handleRemove}>
              {t('common.remove')}
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{helperText}</p>
      </div>
      <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Media library</DialogTitle>
            <DialogDescription>Choose from uploaded files or add a new one from your device.</DialogDescription>
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
              {mediaAssetsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading media...</p>}
              {mediaAssetsQuery.isError && <p className="text-sm text-destructive">Failed to load media list.</p>}
              {!mediaAssetsQuery.isLoading && !mediaAssetsQuery.isError && !mediaAssetsQuery.data?.items?.length && (
                <p className="text-sm text-muted-foreground">No media found yet. Upload one to get started.</p>
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
