import { isTextSelection } from '@tiptap/core'
import { Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { type ComponentProps, useCallback } from 'react'

import { Button } from '~/components/ui'

import { features } from '../editor.types'
import { useMenuConfigs } from '../hooks/useMenuConfigs'

type Props = {
  editor: Editor
  /** Не показывать bubble menu, если активен один из этих типов узлов (например, картинка). */
  hideWhenActive?: string[]
}

const DEFAULT_HIDE_WHEN_ACTIVE: string[] = ['image']

/**
 * Дефолтная логика показа из @tiptap/extension-bubble-menu + доп. фильтр по типам узлов.
 * Если передать свой shouldShow в BubbleMenu — встроенная логика полностью заменяется, поэтому копируем её здесь.
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
  const { editor, hideWhenActive = DEFAULT_HIDE_WHEN_ACTIVE } = props

  const { buttons } = useMenuConfigs({ editor, enabledFeautures: [...features], disabledFeatures: ['image', 'horizontalRule', 'breakLine'] })

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
