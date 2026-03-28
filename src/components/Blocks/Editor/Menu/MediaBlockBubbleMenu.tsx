'use client'

import { NodeSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { type ComponentProps, useCallback } from 'react'

import { Button } from '~/components/ui'
import { useT } from '~/providers'

type Props = {
  editor: Editor
  onOpenAudioSettings: () => void
  onOpenVideoSettings: () => void
}

type BubbleMenuShouldShowProps = Parameters<NonNullable<ComponentProps<typeof BubbleMenu>['shouldShow']>>[0]

export const MediaBlockBubbleMenu = (props: Props) => {
  const { editor, onOpenAudioSettings, onOpenVideoSettings } = props
  const t = useT()

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

    if (selection instanceof NodeSelection) {
      const name = selection.node.type.name

      if (name === 'audio' || name === 'articleVideo') {
        return true
      }
    }

    return false
  }, [])

  const onSettings = useCallback(() => {
    const { selection } = editor.state

    if (selection instanceof NodeSelection) {
      if (selection.node.type.name === 'audio') {
        onOpenAudioSettings()

        return
      }

      if (selection.node.type.name === 'articleVideo') {
        onOpenVideoSettings()
      }
    }
  }, [editor, onOpenAudioSettings, onOpenVideoSettings])

  return (
    <BubbleMenu editor={editor} shouldShow={shouldShow} className="bg-neutral-400/80 shadow-md rounded-md p-1 flex gap-2">
      <Button type="button" variant="outline" size="sm-md" onMouseDown={(e) => e.preventDefault()} onClick={onSettings}>
        {t('common.mediaBlockProperties')}
      </Button>
    </BubbleMenu>
  )
}
