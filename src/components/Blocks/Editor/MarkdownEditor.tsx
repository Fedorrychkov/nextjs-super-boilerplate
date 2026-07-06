'use client'

import './styles/editor.styles.scss'

import { Editor } from '@tiptap/react'
import { useCallback, useEffect, useRef } from 'react'

import { Textarea } from '~/components/ui/fields/textarea'

import { useDefaultEditor } from './hooks/useDefaultEditor'

type Props = {
  editor?: Editor | null
  defaultContent?: string | null
  value?: string | null
  onChange?: (value: string) => void
  limit?: number | null
  isDisabled?: boolean
}

export const MarkdownEditor = (props: Props) => {
  const { defaultContent = null, limit, editor: defaultEditor, value, onChange, isDisabled } = props

  const { editor: newEditor } = useDefaultEditor({ defaultContent, limit })

  const editor = defaultEditor ?? newEditor

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const syncHeight = useCallback(() => {
    const el = textareaRef.current

    if (!el) {
      return
    }

    el.style.height = `${el.scrollHeight}px`
  }, [])

  useEffect(() => {
    syncHeight()
  }, [value, syncHeight])

  if (!editor || !editor?.markdown) return null

  return (
    <>
      <Textarea
        ref={textareaRef}
        className="w-full min-h-[8rem] overflow-hidden p-4 rounded-md resize-none border border-neutral-400 shadow-[0_0_10px_0_rgba(0,0,0,0.1)]"
        name="markdown"
        disabled={isDisabled}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </>
  )
}
