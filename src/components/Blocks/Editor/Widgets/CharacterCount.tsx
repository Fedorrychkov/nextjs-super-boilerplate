import { Editor, useEditorState } from '@tiptap/react'

type Props = {
  editor: Editor
  limit?: number | null
}

export const CharacterCount = (props: Props) => {
  const { editor, limit = 0 } = props

  const { charactersCount, wordsCount } = useEditorState({
    editor,
    selector: (context) => ({
      charactersCount: context.editor.storage.characterCount.characters(),
      wordsCount: context.editor.storage.characterCount.words(),
    }),
  })

  if (!limit) return null

  const percentage = editor ? Math.round((100 / limit) * charactersCount) : 0

  return (
    <div className={`character-count ${charactersCount === limit ? 'character-count--warning' : ''}`}>
      <svg height="20" width="20" viewBox="0 0 20 20">
        <circle r="10" cx="10" cy="10" fill="#e9ecef" />
        <circle
          r="5"
          cx="10"
          cy="10"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={`calc(${percentage} * 31.4 / 100) 31.4`}
          transform="rotate(-90) translate(-20)"
        />
        <circle r="6" cx="10" cy="10" fill="white" />
      </svg>
      {charactersCount} / {limit} characters
      <br />
      {wordsCount} words
    </div>
  )
}
