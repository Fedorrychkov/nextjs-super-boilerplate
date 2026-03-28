import { Editor } from '@tiptap/react'

import type { TFunction } from '~/lib/i18n'

import { features } from './editor.types'

export type FeatureConfigOptions = {
  /** Open link dialog (instead of toggleLink without href) */
  openLinkDialog?: () => void
  /** Open image dialog (mode "from zero") */
  openImageDialog?: () => void
  openAudioDialog?: () => void
  openVideoDialog?: () => void
}

export const getFeatureConfig = (
  editor: Editor,
  options?: FeatureConfigOptions,
  t?: TFunction,
): Record<
  (typeof features)[number],
  {
    label: string
    onClick: () => void
  }
> => {
  return {
    bold: {
      label: t?.('common.bold') ?? 'Bold',
      onClick: () => editor.chain().focus()?.toggleBold().run(),
    },
    italic: {
      label: t?.('common.italic') ?? 'Italic',
      onClick: () => editor.chain().focus()?.toggleItalic().run(),
    },
    underline: {
      label: t?.('common.underline') ?? 'Underline',
      onClick: () => editor.chain().focus()?.toggleUnderline().run(),
    },
    strike: {
      label: t?.('common.strike') ?? 'Strike',
      onClick: () => editor.chain().focus()?.toggleStrike().run(),
    },
    codeBlock: {
      label: t?.('common.codeBlock') ?? 'Code Block',
      onClick: () => editor.chain().focus()?.toggleCodeBlock().run(),
    },
    link: {
      label: t?.('common.link') ?? 'Link',
      onClick: () => {
        if (options?.openLinkDialog) {
          options.openLinkDialog()

          return
        }

        editor.chain().focus()?.toggleLink().run()
      },
    },
    h1: {
      label: 'H1',
      onClick: () => editor.chain().focus()?.toggleHeading({ level: 1 }).run(),
    },
    h2: {
      label: 'H2',
      onClick: () => editor.chain().focus()?.toggleHeading({ level: 2 }).run(),
    },
    h3: {
      label: 'H3',
      onClick: () => editor.chain().focus()?.toggleHeading({ level: 3 }).run(),
    },
    alignLeft: {
      label: t?.('common.alignLeft') ?? '◧ Left',
      onClick: () => editor.chain().focus()?.setTextAlign('left').run(),
    },
    alignCenter: {
      label: t?.('common.alignCenter') ?? '▣ Center',
      onClick: () => editor.chain().focus()?.setTextAlign('center').run(),
    },
    alignRight: {
      label: t?.('common.alignRight') ?? '◨ Right',
      onClick: () => editor.chain().focus()?.setTextAlign('right').run(),
    },
    taskList: {
      label: t?.('common.taskList') ?? 'Task List',
      onClick: () => editor.chain().focus()?.toggleTaskList().run(),
    },
    bulletList: {
      label: t?.('common.bulletList') ?? 'Bullet List',
      onClick: () => editor.chain().focus()?.toggleBulletList().run(),
    },
    orderedList: {
      label: t?.('common.orderedList') ?? 'Ordered List',
      onClick: () => editor.chain().focus()?.toggleOrderedList().run(),
    },
    blockquote: {
      label: t?.('common.blockquote') ?? 'Blockquote',
      onClick: () => editor.chain().focus()?.toggleBlockquote().run(),
    },
    horizontalRule: {
      label: t?.('common.horizontalRule') ?? 'Horizontal Rule',
      onClick: () => editor.chain().focus()?.setHorizontalRule().run(),
    },
    breakLine: {
      label: t?.('common.breakLine') ?? 'Break Line',
      onClick: () => editor.chain().focus()?.enter().run(),
    },
    image: {
      label: t?.('common.image') ?? 'Image',
      onClick: () => {
        if (options?.openImageDialog) {
          options.openImageDialog()

          return
        }

        editor
          .chain()
          .focus()
          ?.insertContentAt(editor.state.selection.anchor, {
            type: 'image',
            attrs: {
              src: 'https://via.placeholder.com/150',
            },
          })
          .run()
      },
    },
    audio: {
      label: t?.('common.audio') ?? 'Audio',
      onClick: () => {
        options?.openAudioDialog?.()
      },
    },
    video: {
      label: t?.('common.video') ?? 'Video',
      onClick: () => {
        options?.openVideoDialog?.()
      },
    },
  }
}
