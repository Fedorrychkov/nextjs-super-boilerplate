import { Editor } from '@tiptap/react'

import { features } from './editor.types'

export const getFeatureConfig = (
  editor: Editor,
): Record<
  (typeof features)[number],
  {
    label: string
    onClick: () => void
  }
> => {
  return {
    bold: {
      label: 'Bold',
      onClick: () => editor.chain().focus()?.toggleBold().run(),
    },
    italic: {
      label: 'Italic',
      onClick: () => editor.chain().focus()?.toggleItalic().run(),
    },
    underline: {
      label: 'Underline',
      onClick: () => editor.chain().focus()?.toggleUnderline().run(),
    },
    strike: {
      label: 'Strike',
      onClick: () => editor.chain().focus()?.toggleStrike().run(),
    },
    codeBlock: {
      label: 'Code Block',
      onClick: () => editor.chain().focus()?.toggleCodeBlock().run(),
    },
    /**
     * TODO: Add link validation and settlement
     */
    link: {
      label: 'Link',
      onClick: () => editor.chain().focus()?.toggleLink().run(),
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
    bulletList: {
      label: 'Bullet List',
      onClick: () => editor.chain().focus()?.toggleBulletList().run(),
    },
    orderedList: {
      label: 'Ordered List',
      onClick: () => editor.chain().focus()?.toggleOrderedList().run(),
    },
    blockquote: {
      label: 'Blockquote',
      onClick: () => editor.chain().focus()?.toggleBlockquote().run(),
    },
    horizontalRule: {
      label: 'Horizontal Rule',
      onClick: () => editor.chain().focus()?.setHorizontalRule().run(),
    },
    breakLine: {
      label: 'Break Line',
      onClick: () => editor.chain().focus()?.enter().run(),
    },
    // TODO: add image upload
    image: {
      label: 'Image',
      onClick: () =>
        editor
          .chain()
          .focus()
          ?.insertContentAt(editor.state.selection.anchor, {
            type: 'image',
            attrs: {
              src: 'https://via.placeholder.com/150',
            },
          })
          .run(),
    },
  }
}
