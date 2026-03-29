'use client'

import { TextSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/ui'
import { Input } from '~/components/ui/input'

import { DEFAULT_LINK_URI_CTX, isAllowedHref, normalizeUrlForLink } from './linkPolicy'

/** When `setLink` returns false (chain quirks / marks), apply link mark in one transaction. */
function applyLinkMarkToRange(editor: Editor, from: number, to: number, href: string): boolean {
  const linkType = editor.schema.marks.link

  if (!linkType) {
    return false
  }

  const lo = Math.min(from, to)
  const hi = Math.max(from, to)

  if (lo >= hi) {
    return false
  }

  const mark = linkType.create({ href })
  const { state } = editor
  const tr = state.tr

  tr.setSelection(TextSelection.create(tr.doc, lo, hi))
  tr.setMeta('preventAutolink', true)

  state.doc.nodesBetween(lo, hi, (node, pos) => {
    if (!node.isText) {
      return true
    }

    const trimmedFrom = Math.max(pos, lo)
    const trimmedTo = Math.min(pos + node.nodeSize, hi)
    const existing = node.marks.find((m) => m.type === linkType)

    if (existing) {
      tr.addMark(trimmedFrom, trimmedTo, linkType.create({ ...existing.attrs, ...mark.attrs }))
    } else {
      tr.addMark(trimmedFrom, trimmedTo, mark)
    }

    return true
  })

  editor.view.dispatch(tr)

  return true
}

function readLinkHrefForRange(editor: Editor, from: number, to: number): string {
  const { doc } = editor.state
  let href = ''
  const lo = Math.min(from, to)
  const hi = Math.max(from, to)
  const end = hi > lo ? hi : Math.min(lo + 1, doc.content.size)

  doc.nodesBetween(lo, end, (node) => {
    if (!node.isText) {
      return true
    }

    const m = node.marks.find((mk) => mk.type.name === 'link')

    if (m?.attrs?.href) {
      href = String(m.attrs.href)

      return false
    }

    return true
  })

  if (!href && doc.content.size > 0) {
    const $pos = doc.resolve(Math.min(Math.max(0, lo), doc.content.size - 1))
    const m = $pos.marks().find((mk) => mk.type.name === 'link')

    if (m?.attrs?.href) {
      href = String(m.attrs.href)
    }
  }

  return href
}

type Props = {
  editor: Editor | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Range captured synchronously when opening the dialog (e.g. toolbar click), before focus moves to the input.
   * Without this, `setLink` after Save can apply to the wrong slice of the document.
   */
  capturedSelection?: { from: number; to: number } | null
}

export const LinkEditorDialog = (props: Props) => {
  const { editor, open, onOpenChange, capturedSelection = null } = props
  const [href, setHref] = useState('')
  /** True if the opened range had a link (for Remove — `isActive('link')` is false while the dialog is focused). */
  const [hadLinkWhenOpened, setHadLinkWhenOpened] = useState(false)
  /** Selection when the dialog opened — after focus moves to the input, `isActive('link')` is unreliable. */
  const linkEditRangeRef = useRef<{ from: number; to: number } | null>(null)

  useEffect(() => {
    if (!open) {
      linkEditRangeRef.current = null

      return
    }

    if (!editor) {
      return
    }

    if (capturedSelection) {
      linkEditRangeRef.current = capturedSelection
    } else {
      const { from, to } = editor.state.selection
      linkEditRangeRef.current = { from, to }
    }

    queueMicrotask(() => {
      const range = linkEditRangeRef.current
      const fromAttrs = range ? readLinkHrefForRange(editor, range.from, range.to) : ''
      const fallback = editor.getAttributes('link') as { href?: string }
      const nextHref = fromAttrs || (fallback.href ?? '')

      setHref(nextHref)
      setHadLinkWhenOpened(Boolean(nextHref.trim()))
    })
  }, [open, editor, capturedSelection])

  const apply = useCallback(() => {
    if (!editor) {
      return
    }

    const range = linkEditRangeRef.current
    const trimmed = href.trim()

    if (!trimmed) {
      if (range) {
        const lo = Math.min(range.from, range.to)
        const hi = Math.max(range.from, range.to)

        if (lo < hi) {
          editor.commands.setTextSelection({ from: lo, to: hi })
          editor.commands.extendMarkRange('link')
          editor.commands.unsetLink()
        }
      } else if (editor.isActive('link')) {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
      }

      onOpenChange(false)

      return
    }

    const normalized = normalizeUrlForLink(trimmed)

    if (!normalized || !isAllowedHref(normalized, DEFAULT_LINK_URI_CTX)) {
      return
    }

    if (range) {
      const lo = Math.min(range.from, range.to)
      const hi = Math.max(range.from, range.to)

      if (lo >= hi) {
        onOpenChange(false)

        return
      }

      /*
       * Two separate commands: each reads fresh `editor.state` after the previous dispatch.
       * A single long chain with `focus()` + `setLink` (nested dispatch) often left the doc unchanged.
       */
      editor.commands.setTextSelection({ from: lo, to: hi })

      const applied = editor.commands.setLink({ href: normalized })

      if (!applied) {
        applyLinkMarkToRange(editor, lo, hi, normalized)
      }
    } else {
      let chain = editor.chain().focus()

      if (editor.isActive('link')) {
        chain = chain.extendMarkRange('link')
      }

      chain.setLink({ href: normalized }).run()
    }

    onOpenChange(false)
  }, [editor, href, onOpenChange])

  const removeLink = useCallback(() => {
    if (!editor) {
      return
    }

    const range = linkEditRangeRef.current

    if (range) {
      const lo = Math.min(range.from, range.to)
      const hi = Math.max(range.from, range.to)

      if (lo < hi) {
        editor.commands.setTextSelection({ from: lo, to: hi })
        editor.commands.extendMarkRange('link')
        editor.commands.unsetLink()
      }
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }

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
          {hadLinkWhenOpened && (
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
