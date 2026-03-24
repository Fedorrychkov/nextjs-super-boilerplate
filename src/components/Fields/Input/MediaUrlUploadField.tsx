'use client'

import { AxiosError } from 'axios'
import Image from 'next/image'
import { useCallback, useMemo, useRef, useState } from 'react'

import { MediaAssetModel, MediaResourceType } from '~/api/media'
import { ImageLoader } from '~/components/Containers'
import { Button } from '~/components/ui'
import { Input } from '~/components/ui/input'
import { useNotify } from '~/providers/notify'
import { useDeleteMediaMutation, useUploadMediaMutation } from '~/query/media'

type Props = {
  label: string
  value: string
  assetId?: string | null
  disabled?: boolean
  hintText?: string
  resourceType?: MediaResourceType
  variant?: 'inline' | 'thumb' | 'seo' | 'original'
  articleRevisionId?: string | null
  onChange: (next: { value: string; removed?: boolean; assetId?: string | null; asset?: MediaAssetModel | null }) => void
}

export const MediaUrlUploadField = (props: Props) => {
  const { label, value, assetId, disabled, hintText, resourceType = MediaResourceType.IMAGE, variant = 'inline', articleRevisionId, onChange } = props

  const inputFileRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const { notify } = useNotify()
  const { uploadMediaMutation } = useUploadMediaMutation()
  const { deleteMediaMutation } = useDeleteMediaMutation()

  const isBusy = uploadMediaMutation.isLoading || deleteMediaMutation.isLoading
  const canRemove = Boolean(value || assetId)

  const handleUploadFile = useCallback(
    async (file: File) => {
      try {
        const uploaded = await uploadMediaMutation.mutateAsync({ file, resourceType })

        onChange({ value: `${uploaded.proxyUrl}/${variant}`, assetId: uploaded.asset.id, asset: uploaded.asset })
        notify('File uploaded', 'success')
      } catch (_error) {
        notify('Failed to upload file', 'destructive')
      }
    },
    [notify, onChange, resourceType, uploadMediaMutation, variant],
  )

  const handleRemove = useCallback(async () => {
    try {
      if (assetId) {
        await deleteMediaMutation.mutateAsync({ assetId, articleRevisionId: articleRevisionId ?? undefined })

        onChange({ value: '', assetId: null, asset: null, removed: true })

        notify('File removed', 'success')
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        notify(error.response?.data?.reason ?? 'Failed to remove file', 'destructive')

        return
      }

      notify('Failed to remove file', 'destructive')
    }
  }, [assetId, articleRevisionId, deleteMediaMutation, onChange, notify])

  const helperText = useMemo(() => {
    if (hintText) {
      return hintText
    }

    if (resourceType === MediaResourceType.IMAGE) {
      return 'Upload, paste, or drop an image file. Field stores proxy URL and asset reference.'
    }

    return 'Upload, paste, or drop a file. Field stores proxy URL and asset reference.'
  }, [hintText, resourceType])

  return (
    <div className="flex flex-col gap-2">
      <Input
        label={label}
        value={value}
        onChange={(next) => onChange({ value: next, assetId })}
        disabled={disabled || isBusy}
        placeholder="https://... or /cdn/..."
      />
      <input
        ref={inputFileRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]

          if (file) {
            void handleUploadFile(file)
          }

          event.currentTarget.value = ''
        }}
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
          <Button type="button" variant="secondary" size="sm-md" disabled={disabled || isBusy} onClick={() => inputFileRef.current?.click()}>
            Upload
          </Button>
          {assetId && (
            <Button type="button" variant="outline" size="sm-md" disabled={disabled || isBusy || !canRemove} onClick={handleRemove}>
              Remove
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{helperText}</p>
      </div>
    </div>
  )
}
