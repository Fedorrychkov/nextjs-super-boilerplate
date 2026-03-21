'use client'

import './styles/editor.styles.scss'

import DragHandle from '@tiptap/extension-drag-handle-react'
import { Editor, EditorContent } from '@tiptap/react'

import { useDefaultEditor } from './hooks/useDefaultEditor'
import { CustomBubbleMenu } from './Menu/BubbleMenu'
import { CustomFloatingMenu } from './Menu/FloatingMenu'
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
      <CustomBubbleMenu editor={editor} />
      <CustomFloatingMenu editor={editor} />
      <EditorContent editor={editor} />
      <CharacterCount editor={editor} limit={limit} />
    </>
  )
}
