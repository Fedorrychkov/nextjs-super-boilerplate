'use client'

import type { Editor } from '@tiptap/react'
import { useCallback, useEffect, useState } from 'react'

import { MediaResourceType } from '~/api/media'
import { MediaUrlUploadField } from '~/components/Fields'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui'
import { useT } from '~/providers'

import { resolveExternalImageSrc } from '../image/resolveImageSrc'
import { getSelectedBlockNodePosition } from './mediaBlockSelection'

export type AudioEditorDialogMode = 'create' | 'edit'

type FormState = {
  src: string
  assetId: string
}

const emptyForm: FormState = { src: '', assetId: '' }

type Props = {
  editor: Editor | null
  open: boolean
  mode: AudioEditorDialogMode
  onOpenChange: (open: boolean) => void
  articleRevisionId?: string | null
}

export const AudioEditorDialog = (props: Props) => {
  const t = useT()
  const { editor, open, mode, onOpenChange, articleRevisionId } = props
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)

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

      const pos = getSelectedBlockNodePosition(editor, ['audio'])

      if (pos == null) {
        return
      }

      const node = editor.state.doc.nodeAt(pos)

      if (!node || node.type.name !== 'audio') {
        return
      }

      const a = node.attrs

      setForm({
        src: (a.src as string) ?? '',
        assetId: (a.assetId as string) ?? '',
      })
    })
  }, [open, editor, mode])

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

    if (mode === 'create') {
      editor
        .chain()
        .focus()
        .insertContentAt(editor.state.selection.anchor, {
          type: 'audio',
          attrs: {
            src,
            assetId: form.assetId || null,
            resourceType: MediaResourceType.AUDIO,
            controls: true,
            preload: 'metadata',
          },
        })
        .run()
      onOpenChange(false)

      return
    }

    const pos = getSelectedBlockNodePosition(editor, ['audio'])

    if (pos == null) {
      setError(t('media.ui.selectMediaBlock'))

      return
    }

    const node = editor.state.doc.nodeAt(pos)

    if (!node || node.type.name !== 'audio') {
      setError(t('media.ui.audioNodeNotFound'))

      return
    }

    editor
      .chain()
      .focus()
      .setNodeSelection(pos)
      .updateAttributes('audio', {
        src,
        assetId: form.assetId || null,
        resourceType: MediaResourceType.AUDIO,
        controls: true,
        preload: 'metadata',
      })
      .run()
    onOpenChange(false)
  }, [editor, form, mode, onOpenChange, t])

  const title = mode === 'create' ? t('media.ui.addAudio') : t('media.ui.audio')
  const description = mode === 'create' ? t('media.ui.addAudioDescription') : t('media.ui.editAudioDescription')
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
            label={t('media.ui.mediaUrl')}
            value={form.src}
            assetId={form.assetId || null}
            articleRevisionId={articleRevisionId}
            resourceType={MediaResourceType.AUDIO}
            variant="original"
            hintText={t('media.ui.audioUploadHint')}
            onChange={(next) => {
              setForm((s) => ({
                ...s,
                src: next.value ?? '',
                assetId: next.assetId ?? '',
              }))
            }}
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
