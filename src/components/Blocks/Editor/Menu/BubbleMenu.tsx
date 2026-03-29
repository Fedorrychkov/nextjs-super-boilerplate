import { isTextSelection } from '@tiptap/core'
import { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { type ComponentProps, useCallback } from 'react'

import { Button } from '~/components/ui'

import { features } from '../editor.types'
import { useMenuConfigs } from '../hooks/useMenuConfigs'

type Props = {
  editor: Editor
  /** Do not show bubble menu if one of these node types is active (e.g. image). */
  hideWhenActive?: string[]
  /** Open link dialog instead of toggleLink */
  onLinkDialogOpen?: () => void
  /** Modal to add image by URL */
  onImageDialogOpen?: () => void
  onAudioDialogOpen?: () => void
  onVideoDialogOpen?: () => void
}

const DEFAULT_HIDE_WHEN_ACTIVE: string[] = ['image', 'audio', 'articleVideo']

/**
 * Default logic from @tiptap/extension-bubble-menu + additional filter by node types.
 * If you pass your own shouldShow in BubbleMenu — the built-in logic is completely replaced, so we copy it here.
 */
type BubbleMenuShouldShowProps = Parameters<NonNullable<ComponentProps<typeof BubbleMenu>['shouldShow']>>[0]

function bubbleMenuShouldShow(props: BubbleMenuShouldShowProps, hideWhenActive: string[]) {
  const { editor, view, state, from, to, element } = props
  const { doc, selection } = state
  const { empty } = selection

  if (hideWhenActive.some((name) => editor.isActive(name))) {
    return false
  }

  const isEmptyTextBlock = !doc.textBetween(from, to).length && isTextSelection(state.selection)
  const isChildOfMenu = element.contains(document.activeElement)
  const hasEditorFocus = view.hasFocus() || isChildOfMenu

  if (!hasEditorFocus || empty || isEmptyTextBlock || !editor.isEditable) {
    return false
  }

  return true
}

export const CustomBubbleMenu = (props: Props) => {
  const { editor, hideWhenActive = DEFAULT_HIDE_WHEN_ACTIVE, onLinkDialogOpen, onImageDialogOpen, onAudioDialogOpen, onVideoDialogOpen } = props

  const { buttons } = useMenuConfigs({
    editor,
    enabledFeautures: [...features],
    disabledFeatures: ['image', 'audio', 'video', 'horizontalRule', 'breakLine'],
    featureOptions: {
      ...(onLinkDialogOpen ? { openLinkDialog: onLinkDialogOpen } : {}),
      ...(onImageDialogOpen ? { openImageDialog: onImageDialogOpen } : {}),
      ...(onAudioDialogOpen ? { openAudioDialog: onAudioDialogOpen } : {}),
      ...(onVideoDialogOpen ? { openVideoDialog: onVideoDialogOpen } : {}),
    },
  })

  const shouldShow = useCallback((menuProps: BubbleMenuShouldShowProps) => bubbleMenuShouldShow(menuProps, hideWhenActive), [hideWhenActive])

  return (
    <BubbleMenu editor={editor} shouldShow={shouldShow} className="bg-neutral-400/80 bg-blend-overlay shadow-md rounded-md p-1 gap-2 flex flex-wrap max-w-md">
      {buttons.map((button) => (
        <Button key={button.label} variant="outline" size="sm-md" onClick={button.onClick}>
          {button.label}
        </Button>
      ))}
    </BubbleMenu>
  )
}
