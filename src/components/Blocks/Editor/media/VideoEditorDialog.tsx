'use client'

import type { Editor } from '@tiptap/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { MediaResourceType } from '~/api/media'
import { MediaUrlUploadField, MultiselectField } from '~/components/Fields'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Typography } from '~/components/ui'
import { Textarea } from '~/components/ui/fields/textarea'
import { VIDEO_POSTER_CAPTURE_RANGE_BYTES } from '~/constants/media-upload'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'

import type { ArticleVideoAlign } from '../extensions/articleVideo'
import { resolveExternalImageSrc } from '../image/resolveImageSrc'
import { uploadEditorMediaFile } from '../uploadEditorMedia'
import { getSelectedBlockNodePosition } from './mediaBlockSelection'

function computeSeekTimeForPoster(video: HTMLVideoElement): number {
  const dur = video.duration
  const ct = video.currentTime
  let seekTo = ct > 0 ? ct : 0.001

  if (Number.isFinite(dur) && dur > 0) {
    seekTo = Math.min(Math.max(seekTo, 0.001), Math.max(dur - 0.05, 0.001))
  }

  return seekTo
}

async function seekVideoForPosterCapture(video: HTMLVideoElement, time: number): Promise<void> {
  if (Number.isFinite(video.duration) && video.duration > 0 && time >= video.duration) {
    time = Math.max(video.duration - 0.05, 0.001)
  }

  if (Math.abs(video.currentTime - time) < 0.02) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const to = window.setTimeout(() => reject(new Error('seek-timeout')), 30_000)

    const onSeeked = () => {
      window.clearTimeout(to)
      video.removeEventListener('error', onErr)
      resolve()
    }

    const onErr = () => {
      window.clearTimeout(to)
      video.removeEventListener('seeked', onSeeked)
      reject(new Error('seek-error'))
    }

    video.addEventListener('seeked', onSeeked, { once: true })
    video.addEventListener('error', onErr, { once: true })
    video.currentTime = time
  })
}

async function waitForVideoDimensions(video: HTMLVideoElement, timeoutMs: number): Promise<void> {
  if (video.videoWidth > 0 && video.videoHeight > 0) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const to = window.setTimeout(() => reject(new Error('dim-timeout')), timeoutMs)

    const done = () => {
      window.clearTimeout(to)
      video.removeEventListener('error', onErr)

      if (video.videoWidth > 0 && video.videoHeight > 0) {
        resolve()
      } else {
        reject(new Error('no-dimensions'))
      }
    }

    const onErr = () => {
      window.clearTimeout(to)
      video.removeEventListener('loadeddata', done)
      reject(new Error('video-error'))
    }

    video.addEventListener('loadeddata', done, { once: true })
    video.addEventListener('error', onErr, { once: true })
  })
}

async function captureJpegBlobFromVideoElement(video: HTMLVideoElement): Promise<Blob> {
  await waitForVideoDimensions(video, 30_000)
  const seekTo = computeSeekTimeForPoster(video)
  await seekVideoForPosterCapture(video, seekTo)

  const w = video.videoWidth
  const h = video.videoHeight

  if (!w || !h) {
    throw new Error('no-dimensions')
  }

  const canvas = document.createElement('canvas')

  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('no-ctx')
  }

  ctx.drawImage(video, 0, 0, w, h)

  const blob = await new Promise<Blob | null>((resolve, reject) => {
    try {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88)
    } catch (err) {
      reject(err)
    }
  })

  if (!blob) {
    throw new Error('no-blob')
  }

  return blob
}

async function loadDetachedVideoFromBlob(blob: Blob): Promise<{ video: HTMLVideoElement; revoke: () => void }> {
  const objectUrl = URL.createObjectURL(blob)
  const v = document.createElement('video')

  v.muted = true
  v.playsInline = true
  v.preload = 'auto'
  v.src = objectUrl

  await new Promise<void>((resolve, reject) => {
    const to = window.setTimeout(() => reject(new Error('load-timeout')), 60_000)

    v.onloadeddata = () => {
      window.clearTimeout(to)
      resolve()
    }

    v.onerror = () => {
      window.clearTimeout(to)
      reject(new Error('video-load'))
    }

    v.load()
  })

  return { video: v, revoke: () => URL.revokeObjectURL(objectUrl) }
}

async function tryDecodePosterFromBlob(blob: Blob): Promise<Blob> {
  const { video: v, revoke } = await loadDetachedVideoFromBlob(blob)

  try {
    return await captureJpegBlobFromVideoElement(v)
  } finally {
    revoke()
  }
}

export type VideoEditorDialogMode = 'create' | 'edit'

type FormState = {
  src: string
  assetId: string
  poster: string
  posterAssetId: string
  caption: string
  align: ArticleVideoAlign
}

const emptyForm: FormState = {
  src: '',
  assetId: '',
  poster: '',
  posterAssetId: '',
  caption: '',
  align: 'center',
}

type Props = {
  editor: Editor | null
  open: boolean
  mode: VideoEditorDialogMode
  onOpenChange: (open: boolean) => void
  articleRevisionId?: string | null
}

export const VideoEditorDialog = (props: Props) => {
  const t = useT()
  const { notify } = useNotify()
  const { editor, open, mode, onOpenChange, articleRevisionId } = props
  const [form, setForm] = useState<FormState>(emptyForm)

  const videoAlignOptions = [
    { value: 'left', label: t('common.alignLeft') },
    { value: 'center', label: t('common.alignCenter') },
    { value: 'right', label: t('common.alignRight') },
  ]
  const [error, setError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!open || !editor) {
      return
    }

    queueMicrotask(() => {
      setError(null)

      if (mode === 'create') {
        setForm(emptyForm)

        return
      }

      const pos = getSelectedBlockNodePosition(editor, ['articleVideo'])

      if (pos == null) {
        return
      }

      const node = editor.state.doc.nodeAt(pos)

      if (!node || node.type.name !== 'articleVideo') {
        return
      }

      const a = node.attrs

      setForm({
        src: (a.src as string) ?? '',
        assetId: (a.assetId as string) ?? '',
        poster: (a.poster as string) ?? '',
        posterAssetId: (a.posterAssetId as string) ?? '',
        caption: (a.caption as string) ?? '',
        align: (a.align as ArticleVideoAlign) || 'center',
      })
    })
  }, [open, editor, mode])

  const previewSrc = form.src
    ? form.src.startsWith('http')
      ? form.src
      : `${typeof window !== 'undefined' ? window.location.origin : ''}${form.src.startsWith('/') ? form.src : `/${form.src}`}`
    : ''

  const capturePosterFromVideo = useCallback(async () => {
    const el = videoPreviewRef.current

    if (!el || el.readyState < 2) {
      notify(t('media.ui.videoNotReadyForPoster'), 'destructive')

      return
    }

    const absoluteSrc = form.src.startsWith('http') ? form.src : `${window.location.origin}${form.src.startsWith('/') ? form.src : `/${form.src}`}`

    if (!absoluteSrc) {
      return
    }

    const applyPosterBlob = async (blob: Blob) => {
      const file = new File([blob], 'video-poster.jpg', { type: 'image/jpeg' })
      const uploaded = await uploadEditorMediaFile(file, MediaResourceType.IMAGE)

      if (!uploaded) {
        notify(t('media.errors.failedToUploadFile'), 'destructive')

        return
      }

      const posterPath = uploaded.proxyPath || uploaded.proxyUrl

      setForm((s) => ({
        ...s,
        poster: posterPath,
        posterAssetId: uploaded.assetId,
      }))
      notify(t('media.ui.posterFromFrameSaved'), 'success')
    }

    setCapturing(true)

    try {
      // 1) Prefer the already-buffered preview <video> — no second network download (fast for large local/CDN files).
      try {
        const blob = await captureJpegBlobFromVideoElement(el)
        await applyPosterBlob(blob)

        return
      } catch {
        // CORS-tainted canvas, or decode failed — try ranged then full fetch.
      }

      // 2) Range: first chunk only (often enough for MP4 fast-start); avoids loading full file when server honors Range.
      const rangeEnd = VIDEO_POSTER_CAPTURE_RANGE_BYTES - 1
      const rangeRes = await fetch(absoluteSrc, {
        headers: { Range: `bytes=0-${rangeEnd}` },
        mode: 'cors',
        credentials: 'omit',
      })

      if (rangeRes.ok) {
        const rangeBlob = await rangeRes.blob()

        if (rangeBlob.size > 0) {
          try {
            const blob = await tryDecodePosterFromBlob(rangeBlob)
            await applyPosterBlob(blob)

            return
          } catch {
            // Partial file may lack moov (e.g. MP4) — fall back to full fetch.
          }
        }
      }

      // 3) Full file (last resort).
      const res = await fetch(absoluteSrc, { mode: 'cors', credentials: 'omit' })

      if (!res.ok) {
        notify(t('media.ui.posterCaptureFetchFailed'), 'destructive')

        return
      }

      const mediaBlob = await res.blob()

      try {
        const blob = await tryDecodePosterFromBlob(mediaBlob)
        await applyPosterBlob(blob)
      } catch {
        notify(t('media.ui.posterCaptureFailed'), 'destructive')
      }
    } catch (e) {
      const isSecurity = e instanceof DOMException && e.name === 'SecurityError'

      notify(isSecurity ? t('media.ui.posterCanvasSecurityError') : t('media.ui.posterCaptureFetchFailed'), 'destructive')
    } finally {
      setCapturing(false)
    }
  }, [form.src, notify, t])

  const apply = useCallback(() => {
    if (!editor) {
      return
    }

    setError(null)
    const src = resolveExternalImageSrc(form.src)

    if (!src) {
      setError(t('media.ui.specifyValidUrlOrPath'))

      return
    }

    const posterResolved = form.poster.trim() ? resolveExternalImageSrc(form.poster) : null

    const attrs = {
      src,
      poster: posterResolved,
      assetId: form.assetId || null,
      posterAssetId: form.posterAssetId || null,
      resourceType: MediaResourceType.VIDEO,
      controls: true,
      preload: 'metadata' as const,
      align: form.align,
      caption: form.caption.trim() || null,
    }

    if (mode === 'create') {
      editor.chain().focus().insertContentAt(editor.state.selection.anchor, { type: 'articleVideo', attrs }).run()
      onOpenChange(false)

      return
    }

    const pos = getSelectedBlockNodePosition(editor, ['articleVideo'])

    if (pos == null) {
      setError(t('media.ui.selectMediaBlock'))

      return
    }

    const node = editor.state.doc.nodeAt(pos)

    if (!node || node.type.name !== 'articleVideo') {
      setError(t('media.ui.videoNodeNotFound'))

      return
    }

    editor.chain().focus().setNodeSelection(pos).updateAttributes('articleVideo', attrs).run()
    onOpenChange(false)
  }, [editor, form, mode, onOpenChange, t])

  const title = mode === 'create' ? t('media.ui.addVideo') : t('media.ui.video')
  const description = mode === 'create' ? t('media.ui.addVideoDescription') : t('media.ui.editVideoDescription')
  const submitLabel = mode === 'create' ? t('common.insert') : t('common.save')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" isOverlayClosable>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {error ? <Typography className="text-sm text-destructive">{error}</Typography> : null}
          <MediaUrlUploadField
            label={t('media.ui.videoFile')}
            value={form.src}
            assetId={form.assetId || null}
            articleRevisionId={articleRevisionId}
            resourceType={MediaResourceType.VIDEO}
            variant="original"
            hintText={t('media.ui.videoUploadHint')}
            onChange={(next) => {
              setForm((s) => ({
                ...s,
                src: next.value ?? '',
                assetId: next.assetId ?? '',
              }))
            }}
          />
          {previewSrc ? (
            <div className="flex flex-col gap-2">
              <Typography asTag="span" className="text-[13px] text-gray-900 capitalize">
                {t('media.ui.videoPreviewForPoster')}
              </Typography>
              <video
                ref={videoPreviewRef}
                className="max-h-48 w-full rounded-md border border-border bg-black"
                src={previewSrc}
                crossOrigin={previewSrc.startsWith('http') ? 'anonymous' : undefined}
                controls
                preload="metadata"
                playsInline
              />
              <Button type="button" variant="secondary" size="sm-md" disabled={capturing || !form.src} onClick={() => void capturePosterFromVideo()}>
                {capturing ? t('common.loading') : t('media.ui.posterFromCurrentFrame')}
              </Button>
            </div>
          ) : null}
          <MediaUrlUploadField
            label={t('media.ui.posterImage')}
            value={form.poster}
            assetId={form.posterAssetId || null}
            articleRevisionId={articleRevisionId}
            resourceType={MediaResourceType.IMAGE}
            variant="inline"
            hintText={t('media.ui.posterUploadHint')}
            onChange={(next) => {
              setForm((s) => ({
                ...s,
                poster: next.value ?? '',
                posterAssetId: next.assetId ?? '',
              }))
            }}
          />
          <div>
            <Typography asTag="span" className="text-[13px] text-gray-900 capitalize">
              {t('media.ui.captionUnderTheImage')}
            </Typography>
            <Textarea
              className="mt-2 min-h-[72px]"
              value={form.caption}
              onChange={(e) => setForm((s) => ({ ...s, caption: e.target.value }))}
              placeholder={t('media.ui.videoCaptionPlaceholder')}
            />
          </div>
          <MultiselectField
            label={t('media.ui.alignment')}
            updateBySelected
            value={videoAlignOptions.find((o) => o.value === form.align) ?? null}
            onChange={(opts) => setForm((s) => ({ ...s, align: (opts[0]?.value ?? s.align) as ArticleVideoAlign }))}
            options={videoAlignOptions}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={() => apply()}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
