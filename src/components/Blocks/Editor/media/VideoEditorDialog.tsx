'use client'

import type { Editor } from '@tiptap/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { MediaResourceType } from '~/api/media'
import { MediaUrlUploadField } from '~/components/Fields'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui'
import { Textarea } from '~/components/ui/fields/textarea'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'

import type { ArticleVideoAlign } from '../extensions/articleVideo'
import { resolveExternalImageSrc } from '../image/resolveImageSrc'
import { uploadEditorMediaFile } from '../uploadEditorMedia'
import { getSelectedBlockNodePosition } from './mediaBlockSelection'

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

    setCapturing(true)
    let objectUrl: string | null = null

    try {
      const res = await fetch(absoluteSrc, { mode: 'cors', credentials: 'omit' })

      if (!res.ok) {
        notify(t('media.ui.posterCaptureFetchFailed'), 'destructive')

        return
      }

      const mediaBlob = await res.blob()

      objectUrl = URL.createObjectURL(mediaBlob)
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

      const dur = el.duration
      const ct = el.currentTime
      let seekTo = ct > 0 ? ct : 0.001

      if (Number.isFinite(dur) && dur > 0) {
        seekTo = Math.min(Math.max(seekTo, 0.001), Math.max(dur - 0.05, 0.001))
      }

      v.currentTime = seekTo

      await new Promise<void>((resolve, reject) => {
        const to = window.setTimeout(() => reject(new Error('seek-timeout')), 30_000)

        v.onseeked = () => {
          window.clearTimeout(to)
          resolve()
        }
        v.onerror = () => {
          window.clearTimeout(to)
          reject(new Error('seek-error'))
        }
      })

      const w = v.videoWidth
      const h = v.videoHeight

      if (!w || !h) {
        notify(t('media.ui.videoNotReadyForPoster'), 'destructive')

        return
      }

      const canvas = document.createElement('canvas')

      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        notify(t('media.ui.posterCaptureFailed'), 'destructive')

        return
      }

      ctx.drawImage(v, 0, 0, w, h)

      const blob = await new Promise<Blob | null>((resolve, reject) => {
        try {
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88)
        } catch (err) {
          reject(err)
        }
      })

      if (!blob) {
        notify(t('media.ui.posterCaptureFailed'), 'destructive')

        return
      }

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
    } catch (e) {
      const isSecurity = e instanceof DOMException && e.name === 'SecurityError'

      notify(isSecurity ? t('media.ui.posterCanvasSecurityError') : t('media.ui.posterCaptureFetchFailed'), 'destructive')
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }

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
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
              <span className="text-[13px] text-gray-900 capitalize">{t('media.ui.videoPreviewForPoster')}</span>
              <video
                ref={videoPreviewRef}
                className="max-h-48 w-full rounded-md border border-border bg-black"
                src={previewSrc}
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
            <span className="text-[13px] text-gray-900 capitalize">{t('media.ui.captionUnderTheImage')}</span>
            <Textarea
              className="mt-2 min-h-[72px]"
              value={form.caption}
              onChange={(e) => setForm((s) => ({ ...s, caption: e.target.value }))}
              placeholder={t('media.ui.videoCaptionPlaceholder')}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] text-gray-900 capitalize">{t('media.ui.alignment')}</span>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={form.align}
              onChange={(e) => setForm((s) => ({ ...s, align: e.target.value as ArticleVideoAlign }))}
            >
              <option value="left">{t('common.alignLeft')}</option>
              <option value="center">{t('common.alignCenter')}</option>
              <option value="right">{t('common.alignRight')}</option>
            </select>
          </div>
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
