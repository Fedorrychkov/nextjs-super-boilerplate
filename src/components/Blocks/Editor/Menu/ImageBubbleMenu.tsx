'use client'

import { NodeSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { type ComponentProps, useCallback } from 'react'

import { Button } from '~/components/ui'

type Props = {
  editor: Editor
  onOpenSettings: () => void
}

type BubbleMenuShouldShowProps = Parameters<NonNullable<ComponentProps<typeof BubbleMenu>['shouldShow']>>[0]

/**
 * Shown when NodeSelection on the image node. The main bubble is hidden for image.
 */
export const ImageBubbleMenu = (props: Props) => {
  const { editor, onOpenSettings } = props

  const shouldShow = useCallback((p: BubbleMenuShouldShowProps) => {
    const { editor: ed, view, state, element } = p

    if (!ed.isEditable) {
      return false
    }

    const isChildOfMenu = element.contains(document.activeElement)
    const hasEditorFocus = view.hasFocus() || isChildOfMenu

    if (!hasEditorFocus) {
      return false
    }

    const { selection } = state

    if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
      return true
    }

    return false
  }, [])

  return (
    <BubbleMenu editor={editor} shouldShow={shouldShow} className="bg-neutral-400/80 shadow-md rounded-md p-1 flex gap-2">
      <Button type="button" variant="outline" size="sm-md" onMouseDown={(e) => e.preventDefault()} onClick={() => onOpenSettings()}>
        Image properties
      </Button>
    </BubbleMenu>
  )
}
