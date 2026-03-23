import { NodeSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'

export function getSelectedImagePosition(editor: Editor | null): number | null {
  if (!editor) {
    return null
  }

  const { selection } = editor.state

  if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
    return selection.from
  }

  return null
}
