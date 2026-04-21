'use client'

import { Editor, useEditorState } from '@tiptap/react'
import { ChevronDown, Redo2, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '~/components/ui'
import { useT } from '~/providers'
import { cn } from '~/utils/cn'

import { features } from '../editor.types'
import { type FeatureConfigOptions, getFeatureConfig } from '../util'

const PRIMARY_FEATURES = ['h1', 'h2', 'h3', 'bold', 'italic', 'link'] as const satisfies ReadonlyArray<(typeof features)[number]>

type Props = {
  editor: Editor
  onLinkDialogOpen?: () => void
  onImageDialogOpen?: () => void
  onAudioDialogOpen?: () => void
  onVideoDialogOpen?: () => void
  /** Same exclusions as the old floating menu (block inserts stay in “More”). */
  disabledFeatures?: (typeof features)[number][]
}

export function EditorMainToolbar(props: Props) {
  const { editor, onLinkDialogOpen, onImageDialogOpen, onAudioDialogOpen, onVideoDialogOpen, disabledFeatures = ['horizontalRule', 'breakLine'] } = props
  const t = useT()
  const [moreOpen, setMoreOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const featureOptions: FeatureConfigOptions = useMemo(
    () => ({
      ...(onLinkDialogOpen ? { openLinkDialog: onLinkDialogOpen } : {}),
      ...(onImageDialogOpen ? { openImageDialog: onImageDialogOpen } : {}),
      ...(onAudioDialogOpen ? { openAudioDialog: onAudioDialogOpen } : {}),
      ...(onVideoDialogOpen ? { openVideoDialog: onVideoDialogOpen } : {}),
    }),
    [onLinkDialogOpen, onImageDialogOpen, onAudioDialogOpen, onVideoDialogOpen],
  )

  const { canUndo, canRedo } = useEditorState({
    editor,
    selector: (snapshot) => ({
      canUndo: snapshot.editor.can().undo(),
      canRedo: snapshot.editor.can().redo(),
    }),
  })

  const config = useMemo(() => getFeatureConfig(editor, featureOptions, t), [editor, featureOptions, t])

  const primaryButtons = useMemo(() => PRIMARY_FEATURES.map((key) => ({ key, ...config[key] })), [config])

  const moreKeys = useMemo(() => {
    const primary = new Set<string>(PRIMARY_FEATURES)

    return features.filter((key) => !primary.has(key) && !disabledFeatures.includes(key))
  }, [disabledFeatures])

  const moreButtons = useMemo(() => moreKeys.map((key) => ({ key, ...config[key] })), [config, moreKeys])

  useEffect(() => {
    if (!moreOpen) {
      return
    }

    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) {
        return
      }

      setMoreOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown, true)

    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [moreOpen])

  const runUndo = useCallback(() => {
    editor.chain().focus().undo().run()
  }, [editor])

  const runRedo = useCallback(() => {
    editor.chain().focus().redo().run()
  }, [editor])

  return (
    <div ref={rootRef} className="relative z-20 flex flex-col gap-1">
      <div
        className={cn(
          'flex flex-wrap items-center gap-1 rounded-md border border-neutral-300 bg-neutral-100/90 p-1.5 shadow-sm dark:border-neutral-600 dark:bg-neutral-900/80',
        )}
      >
        <div className="flex items-center gap-0.5 pr-2 mr-1 border-r border-neutral-300 dark:border-neutral-600">
          <Button
            type="button"
            variant="outline"
            size="sm-md"
            className="size-8 shrink-0 p-0"
            disabled={!canUndo}
            title={t('article.ui.editorToolbarUndo')}
            aria-label={t('article.ui.editorToolbarUndo')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={runUndo}
          >
            <Undo2 className="size-4" strokeWidth={2} aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm-md"
            className="size-8 shrink-0 p-0"
            disabled={!canRedo}
            title={t('article.ui.editorToolbarRedo')}
            aria-label={t('article.ui.editorToolbarRedo')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={runRedo}
          >
            <Redo2 className="size-4" strokeWidth={2} aria-hidden />
          </Button>
        </div>

        {primaryButtons.map(({ key, label, onClick }) => (
          <Button key={key} type="button" variant="outline" size="sm-md" title={label} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
            {label}
          </Button>
        ))}

        {moreButtons.length > 0 ? (
          <Button
            type="button"
            variant={moreOpen ? 'default' : 'secondary'}
            size="sm-md"
            className="gap-1 pl-2 pr-2"
            title={t('article.ui.editorToolbarMore')}
            aria-expanded={moreOpen}
            aria-label={t('article.ui.editorToolbarMore')}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setMoreOpen((v) => !v)}
          >
            {t('article.ui.editorToolbarMore')}
            <ChevronDown className={cn('size-4 transition-transform', moreOpen && 'rotate-180')} aria-hidden />
          </Button>
        ) : null}
      </div>

      {moreOpen && moreButtons.length > 0 ? (
        <div
          className="absolute left-0 top-full z-30 mt-1 flex max-h-[min(70vh,24rem)] w-[min(100%,28rem)] flex-wrap gap-1.5 overflow-y-auto rounded-md border border-neutral-300 bg-neutral-100/95 p-2 shadow-md dark:border-neutral-600 dark:bg-neutral-900/95"
          role="menu"
        >
          {moreButtons.map(({ key, label, onClick }) => (
            <Button
              key={key}
              type="button"
              variant="outline"
              size="sm-md"
              title={label}
              role="menuitem"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onClick()
                setMoreOpen(false)
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
