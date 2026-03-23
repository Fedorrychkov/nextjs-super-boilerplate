import { Extension } from '@tiptap/core'

export type TextAlignValue = 'left' | 'center' | 'right' | 'justify'

export type EditorTextAlignOptions = {
  types: string[]
  alignments: TextAlignValue[]
  defaultAlignment: TextAlignValue
}

/**
 * Выравнивание text blocks (paragraph, heading) without separate package @tiptap/extension-text-align.
 */
export const EditorTextAlign = Extension.create<EditorTextAlignOptions>({
  name: 'editorTextAlign',

  addOptions() {
    return {
      types: ['paragraph', 'heading'],
      alignments: ['left', 'center', 'right', 'justify'],
      defaultAlignment: 'left',
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: this.options.defaultAlignment,
            parseHTML: (element) => {
              const align = element.style.textAlign as TextAlignValue

              if (align && this.options.alignments.includes(align)) {
                return align
              }

              return this.options.defaultAlignment
            },
            renderHTML: (attributes) => {
              if (!attributes.textAlign || attributes.textAlign === this.options.defaultAlignment) {
                return {}
              }

              return { style: `text-align: ${attributes.textAlign}` }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setTextAlign:
        (alignment: TextAlignValue) =>
        ({ editor, commands }) => {
          if (!this.options.alignments.includes(alignment)) {
            return false
          }

          const { state } = editor
          const { $from } = state.selection
          const name = $from.parent.type.name

          if (!this.options.types.includes(name)) {
            return false
          }

          return commands.updateAttributes(name, { textAlign: alignment })
        },

      unsetTextAlign:
        () =>
        ({ editor, commands }) => {
          const { state } = editor
          const { $from } = state.selection
          const name = $from.parent.type.name

          if (!this.options.types.includes(name)) {
            return false
          }

          return commands.updateAttributes(name, { textAlign: this.options.defaultAlignment })
        },
    }
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    editorTextAlign: {
      setTextAlign: (alignment: TextAlignValue) => ReturnType
      unsetTextAlign: () => ReturnType
    }
  }
}
