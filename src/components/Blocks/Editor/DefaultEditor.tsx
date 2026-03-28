'use client'

import './styles/editor.styles.scss'

import DragHandle from '@tiptap/extension-drag-handle-react'
import { Editor, EditorContent } from '@tiptap/react'
import { useCallback, useState } from 'react'

import { useDefaultEditor } from './hooks/useDefaultEditor'
import { ImageEditorDialog, type ImageEditorDialogMode } from './image/ImageEditorDialog'
import { LinkEditorDialog } from './link/LinkEditorDialog'
import { AudioEditorDialog, type AudioEditorDialogMode } from './media/AudioEditorDialog'
import { VideoEditorDialog, type VideoEditorDialogMode } from './media/VideoEditorDialog'
import { CustomBubbleMenu } from './Menu/BubbleMenu'
import { CustomFloatingMenu } from './Menu/FloatingMenu'
import { ImageBubbleMenu } from './Menu/ImageBubbleMenu'
import { MediaBlockBubbleMenu } from './Menu/MediaBlockBubbleMenu'
import { CharacterCount } from './Widgets/CharacterCount'

const NESTED_CONFIG = { edgeDetection: { threshold: -16 } }

type Props = {
  editor?: Editor | null
  defaultContent?: string | null
  limit?: number | null
  articleId?: string | null
  articleRevisionId?: string | null
}

export const DefaultEditor = (props: Props) => {
  const { defaultContent = null, limit, editor: defaultEditor, articleId, articleRevisionId } = props

  const { editor: newEditor } = useDefaultEditor({ defaultContent, limit })

  const editor = defaultEditor ?? newEditor

  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [imageDialogMode, setImageDialogMode] = useState<ImageEditorDialogMode>('create')
  const [audioDialogOpen, setAudioDialogOpen] = useState(false)
  const [audioDialogMode, setAudioDialogMode] = useState<AudioEditorDialogMode>('create')
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [videoDialogMode, setVideoDialogMode] = useState<VideoEditorDialogMode>('create')

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

  const openAudioDialogCreate = useCallback(() => {
    setAudioDialogMode('create')
    setAudioDialogOpen(true)
  }, [])

  const openAudioDialogEdit = useCallback(() => {
    setAudioDialogMode('edit')
    setAudioDialogOpen(true)
  }, [])

  const onAudioDialogOpenChange = useCallback((open: boolean) => {
    setAudioDialogOpen(open)

    if (!open) {
      setAudioDialogMode('create')
    }
  }, [])

  const openVideoDialogCreate = useCallback(() => {
    setVideoDialogMode('create')
    setVideoDialogOpen(true)
  }, [])

  const openVideoDialogEdit = useCallback(() => {
    setVideoDialogMode('edit')
    setVideoDialogOpen(true)
  }, [])

  const onVideoDialogOpenChange = useCallback((open: boolean) => {
    setVideoDialogOpen(open)

    if (!open) {
      setVideoDialogMode('create')
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
      <CustomBubbleMenu
        editor={editor}
        onImageDialogOpen={openImageDialogCreate}
        onAudioDialogOpen={openAudioDialogCreate}
        onVideoDialogOpen={openVideoDialogCreate}
        onLinkDialogOpen={openLinkDialog}
      />
      <ImageBubbleMenu editor={editor} onOpenSettings={openImageDialogEdit} />
      <MediaBlockBubbleMenu editor={editor} onOpenAudioSettings={openAudioDialogEdit} onOpenVideoSettings={openVideoDialogEdit} />
      <CustomFloatingMenu
        editor={editor}
        onImageDialogOpen={openImageDialogCreate}
        onAudioDialogOpen={openAudioDialogCreate}
        onVideoDialogOpen={openVideoDialogCreate}
        onLinkDialogOpen={openLinkDialog}
      />
      <LinkEditorDialog editor={editor} open={linkDialogOpen} onOpenChange={setLinkDialogOpen} />
      <ImageEditorDialog
        editor={editor}
        mode={imageDialogMode}
        open={imageDialogOpen}
        onOpenChange={onImageDialogOpenChange}
        articleId={articleId}
        articleRevisionId={articleRevisionId}
      />
      <AudioEditorDialog
        editor={editor}
        mode={audioDialogMode}
        open={audioDialogOpen}
        onOpenChange={onAudioDialogOpenChange}
        articleRevisionId={articleRevisionId}
      />
      <VideoEditorDialog
        editor={editor}
        mode={videoDialogMode}
        open={videoDialogOpen}
        onOpenChange={onVideoDialogOpenChange}
        articleRevisionId={articleRevisionId}
      />
      <EditorContent editor={editor} />
      <CharacterCount editor={editor} limit={limit} />
    </>
  )
}
