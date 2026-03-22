'use client'

import type { Editor } from '@tiptap/react'
import { useCallback, useEffect, useState } from 'react'

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui'
import { Input } from '~/components/ui/input'

import { DEFAULT_LINK_URI_CTX, isAllowedHref, normalizeUrlForLink } from './linkPolicy'

type Props = {
  editor: Editor | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const LinkEditorDialog = (props: Props) => {
  const { editor, open, onOpenChange } = props
  const [href, setHref] = useState('')

  useEffect(() => {
    if (!open || !editor) {
      return
    }

    const attrs = editor.getAttributes('link') as { href?: string }

    queueMicrotask(() => {
      setHref(attrs.href ?? '')
    })
  }, [open, editor])

  const apply = useCallback(() => {
    if (!editor) {
      return
    }

    const trimmed = href.trim()

    if (!trimmed) {
      if (editor.isActive('link')) {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
      }

      onOpenChange(false)

      return
    }

    const normalized = normalizeUrlForLink(trimmed)

    if (!normalized || !isAllowedHref(normalized, DEFAULT_LINK_URI_CTX)) {
      return
    }

    let chain = editor.chain().focus()

    if (editor.isActive('link')) {
      chain = chain.extendMarkRange('link')
    }

    chain.setLink({ href: normalized }).run()
    onOpenChange(false)
  }, [editor, href, onOpenChange])

  const removeLink = useCallback(() => {
    if (!editor) {
      return
    }

    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    onOpenChange(false)
  }, [editor, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" isOverlayClosable>
        <DialogHeader>
          <DialogTitle>Link</DialogTitle>
          <DialogDescription>Enter URL. The text will become a link only after saving with a non-empty address.</DialogDescription>
        </DialogHeader>
        <Input placeholder="https://example.com" value={href} onChange={(v) => setHref(v)} size="medium" label="URL" />
        <DialogFooter className="gap-2 sm:gap-3">
          {editor?.isActive('link') && (
            <Button type="button" variant="destructive" size="sm-md" onClick={removeLink}>
              Remove link
            </Button>
          )}
          <Button type="button" variant="secondary" size="sm-md" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm-md" onClick={apply}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
