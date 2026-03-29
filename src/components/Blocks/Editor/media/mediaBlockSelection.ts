import { NodeSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'

export function getSelectedBlockNodePosition(editor: Editor | null, nodeTypeNames: string[]): number | null {
  if (!editor) {
    return null
  }

  const { selection } = editor.state

  if (selection instanceof NodeSelection && nodeTypeNames.includes(selection.node.type.name)) {
    return selection.from
  }

  return null
}
