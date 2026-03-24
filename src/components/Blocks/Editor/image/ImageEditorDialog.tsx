'use client'

import type { Editor } from '@tiptap/react'
import { useCallback, useEffect, useState } from 'react'

import { MediaResourceType } from '~/api/media'
import { MediaUrlUploadField } from '~/components/Fields'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui'
import { Textarea } from '~/components/ui/fields/textarea'
import { Input } from '~/components/ui/input'

import type { ArticleImageAlign, ArticleImageObjectFit } from '../extensions/articleImage'
import { getSelectedImagePosition } from './imageSelection'
import { isDataUrlSrc, resolveExternalImageSrc } from './resolveImageSrc'

export type ImageEditorDialogMode = 'create' | 'edit'

type FormState = {
  src: string
  assetId: string
  alt: string
  caption: string
  objectFit: ArticleImageObjectFit
  align: ArticleImageAlign
  minWidthPx: string
  minHeightPx: string
  maxWidthPx: string
  maxHeightPx: string
}

const emptyForm: FormState = {
  src: '',
  assetId: '',
  alt: '',
  caption: '',
  objectFit: 'contain',
  align: 'center',
  minWidthPx: '',
  minHeightPx: '',
  maxWidthPx: '',
  maxHeightPx: '',
}

function parseOptionalPx(value: string): number | null {
  const t = value.trim()

  if (!t) {
    return null
  }

  const n = Number.parseInt(t, 10)

  return Number.isFinite(n) && n > 0 ? n : null
}

type Props = {
  editor: Editor | null
  open: boolean
  mode: ImageEditorDialogMode
  onOpenChange: (open: boolean) => void
  articleRevisionId?: string | null
}

export const ImageEditorDialog = (props: Props) => {
  const { editor, open, mode, onOpenChange, articleRevisionId } = props
  const [form, setForm] = useState<FormState>(emptyForm)
  /** In edit mode: for external URL you can change src; for data: — not allowed */
  const [srcEditable, setSrcEditable] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !editor) {
      return
    }

    queueMicrotask(() => {
      setError(null)

      if (mode === 'create') {
        setForm(emptyForm)
        setSrcEditable(true)

        return
      }

      const pos = getSelectedImagePosition(editor)

      if (pos == null) {
        return
      }

      const node = editor.state.doc.nodeAt(pos)

      if (!node || node.type.name !== 'image') {
        return
      }

      const a = node.attrs
      const rawSrc = (a.src as string) ?? ''
      const embedded = isDataUrlSrc(rawSrc)

      setSrcEditable(!embedded)
      setForm({
        ...emptyForm,
        src: embedded ? '' : rawSrc,
        assetId: (a.assetId as string) ?? '',
        alt: (a.alt as string) ?? '',
        caption: (a.caption as string) ?? '',
        objectFit: (a.objectFit as ArticleImageObjectFit) || 'contain',
        align: (a.align as ArticleImageAlign) || 'center',
        minWidthPx: a.minWidthPx != null ? String(a.minWidthPx) : '',
        minHeightPx: a.minHeightPx != null ? String(a.minHeightPx) : '',
        maxWidthPx: a.maxWidthPx != null ? String(a.maxWidthPx) : '',
        maxHeightPx: a.maxHeightPx != null ? String(a.maxHeightPx) : '',
      })
    })
  }, [open, editor, mode])

  const commonAttrs = useCallback(() => {
    return {
      alt: form.alt.trim() || null,
      caption: form.caption.trim() || null,
      objectFit: form.objectFit,
      align: form.align,
      minWidthPx: parseOptionalPx(form.minWidthPx),
      minHeightPx: parseOptionalPx(form.minHeightPx),
      maxWidthPx: parseOptionalPx(form.maxWidthPx),
      maxHeightPx: parseOptionalPx(form.maxHeightPx),
    }
  }, [form])

  const apply = useCallback(() => {
    if (!editor) {
      return
    }

    setError(null)

    if (mode === 'create') {
      const src = resolveExternalImageSrc(form.src)

      if (!src) {
        setError('Specify a valid URL (https://…) or path from the root of the site (/…). Inserting base64 — through copy/paste/drop in the text.')

        return
      }

      editor
        .chain()
        .focus()
        .insertContentAt(editor.state.selection.anchor, {
          type: 'image',
          attrs: {
            src,
            assetId: form.assetId || null,
            resourceType: MediaResourceType.IMAGE,
            ...commonAttrs(),
          },
        })
        .run()

      onOpenChange(false)

      return
    }

    const pos = getSelectedImagePosition(editor)

    if (pos == null) {
      setError('Select an image in the text.')

      return
    }

    const node = editor.state.doc.nodeAt(pos)

    if (!node || node.type.name !== 'image') {
      setError('Image node not found.')

      return
    }

    const rawSrc = (node.attrs.src as string) ?? ''
    const attrs = { ...commonAttrs() }

    if (!isDataUrlSrc(rawSrc)) {
      const src = resolveExternalImageSrc(form.src)

      if (!src) {
        setError('Specify a valid URL (https://…) or path /…')

        return
      }

      Object.assign(attrs, { src })
    }

    Object.assign(attrs, {
      assetId: form.assetId || null,
      resourceType: MediaResourceType.IMAGE,
    })

    editor.chain().focus().setNodeSelection(pos).updateAttributes('image', attrs).run()

    onOpenChange(false)
  }, [editor, form, mode, onOpenChange, commonAttrs])

  const title = mode === 'create' ? 'Add image' : 'Image'
  const description =
    mode === 'create'
      ? 'Specify the image address (https or path /…). The rest is up to you. Base64 is inserted by copying or dragging.'
      : 'Alt, caption, frame fitting, alignment and size limits (px). For images by URL you can change the address. Embedded (base64) — only caption and formatting, without changing the URL.'

  const submitLabel = mode === 'create' ? 'Insert' : 'Save'

  const showUrlField = mode === 'create' || srcEditable

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" isOverlayClosable>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {mode === 'edit' && !srcEditable ? (
            <p className="text-sm text-muted-foreground rounded-md border border-border bg-muted/40 px-3 py-2">
              Embedded image (inserted into the document). The address cannot be changed; available alt, caption and formatting.
            </p>
          ) : null}

          {showUrlField ? (
            <MediaUrlUploadField
              label="Image URL"
              value={form.src}
              assetId={form.assetId || null}
              resourceType={MediaResourceType.IMAGE}
              variant="inline"
              articleRevisionId={articleRevisionId}
              onChange={(next) => {
                if (!next?.value && next?.removed) {
                  if (mode === 'edit' && editor) {
                    const pos = getSelectedImagePosition(editor)

                    if (pos != null) {
                      editor.chain().focus().setNodeSelection(pos).deleteSelection().run()
                    }

                    onOpenChange(false)
                  }

                  setForm((s) => ({ ...s, src: '', assetId: '' }))

                  return
                }

                setForm((s) => ({
                  ...s,
                  src: next.value,
                  assetId: next.assetId ?? '',
                }))
              }}
              hintText="Upload/paste/drop image or provide a URL."
            />
          ) : null}

          <Input label="Alt" value={form.alt} onChange={(v) => setForm((s) => ({ ...s, alt: v }))} placeholder="Описание для доступности" />
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-gray-900 capitalize">Caption under the image</span>
            <Textarea value={form.caption} onChange={(e) => setForm((s) => ({ ...s, caption: e.target.value }))} placeholder="Текст под картинкой" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] text-gray-900">Object fit</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                value={form.objectFit}
                onChange={(e) => setForm((s) => ({ ...s, objectFit: e.target.value as ArticleImageObjectFit }))}
              >
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[13px] text-gray-900">Alignment</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                value={form.align}
                onChange={(e) => setForm((s) => ({ ...s, align: e.target.value as ArticleImageAlign }))}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Min width (px)" value={form.minWidthPx} onChange={(v) => setForm((s) => ({ ...s, minWidthPx: v }))} placeholder="auto" />
            <Input label="Min height (px)" value={form.minHeightPx} onChange={(v) => setForm((s) => ({ ...s, minHeightPx: v }))} placeholder="auto" />
            <Input label="Max width (px)" value={form.maxWidthPx} onChange={(v) => setForm((s) => ({ ...s, maxWidthPx: v }))} placeholder="auto" />
            <Input label="Max height (px)" value={form.maxHeightPx} onChange={(v) => setForm((s) => ({ ...s, maxHeightPx: v }))} placeholder="optional" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" size="sm-md" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="button" size="sm-md" onClick={apply}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
