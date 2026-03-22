'use client'

import './styles/editor.styles.scss'

import DragHandle from '@tiptap/extension-drag-handle-react'
import { Editor, EditorContent } from '@tiptap/react'
import { useCallback, useState } from 'react'

import { useDefaultEditor } from './hooks/useDefaultEditor'
import { ImageEditorDialog, type ImageEditorDialogMode } from './image/ImageEditorDialog'
import { LinkEditorDialog } from './link/LinkEditorDialog'
import { CustomBubbleMenu } from './Menu/BubbleMenu'
import { CustomFloatingMenu } from './Menu/FloatingMenu'
import { ImageBubbleMenu } from './Menu/ImageBubbleMenu'
import { CharacterCount } from './Widgets/CharacterCount'

const NESTED_CONFIG = { edgeDetection: { threshold: -16 } }

type Props = {
  editor?: Editor | null
  defaultContent?: string | null
  limit?: number | null
}

export const DefaultEditor = (props: Props) => {
  const { defaultContent = null, limit, editor: defaultEditor } = props

  const { editor: newEditor } = useDefaultEditor({ defaultContent, limit })

  const editor = defaultEditor ?? newEditor

  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [imageDialogMode, setImageDialogMode] = useState<ImageEditorDialogMode>('create')

  const openLinkDialog = useCallback(() => {
    setLinkDialogOpen(true)
  }, [])

  const openImageDialogCreate = useCallback(() => {
    setImageDialogMode('create')
    setImageDialogOpen(true)
  }, [])

  const openImageDialogEdit = useCallback(() => {
    setImageDialogMode('edit')
    setImageDialogOpen(true)
  }, [])

  const onImageDialogOpenChange = useCallback((open: boolean) => {
    setImageDialogOpen(open)

    if (!open) {
      setImageDialogMode('create')
    }
  }, [])

  if (!editor) return null

  return (
    <>
      <DragHandle
        editor={defaultEditor ?? editor}
        nested={NESTED_CONFIG}
        computePositionConfig={{
          placement: 'left',
          strategy: 'fixed',
        }}
      >
        <div className="custom-drag-handle" />
      </DragHandle>
      <CustomBubbleMenu editor={editor} onImageDialogOpen={openImageDialogCreate} onLinkDialogOpen={openLinkDialog} />
      <ImageBubbleMenu editor={editor} onOpenSettings={openImageDialogEdit} />
      <CustomFloatingMenu editor={editor} onImageDialogOpen={openImageDialogCreate} onLinkDialogOpen={openLinkDialog} />
      <LinkEditorDialog editor={editor} open={linkDialogOpen} onOpenChange={setLinkDialogOpen} />
      <ImageEditorDialog editor={editor} mode={imageDialogMode} open={imageDialogOpen} onOpenChange={onImageDialogOpenChange} />
      <EditorContent editor={editor} />
      <CharacterCount editor={editor} limit={limit} />
    </>
  )
}
