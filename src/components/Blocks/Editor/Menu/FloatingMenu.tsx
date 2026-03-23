import { Editor } from '@tiptap/react'
import { FloatingMenu } from '@tiptap/react/menus'

import { Button } from '~/components/ui'

import { features } from '../editor.types'
import { useMenuConfigs } from '../hooks/useMenuConfigs'

type Props = {
  editor: Editor
  onLinkDialogOpen?: () => void
  onImageDialogOpen?: () => void
}

export const CustomFloatingMenu = (props: Props) => {
  const { editor, onLinkDialogOpen, onImageDialogOpen } = props

  const { buttons } = useMenuConfigs({
    editor,
    enabledFeautures: [...features],
    featureOptions: {
      ...(onLinkDialogOpen ? { openLinkDialog: onLinkDialogOpen } : {}),
      ...(onImageDialogOpen ? { openImageDialog: onImageDialogOpen } : {}),
    },
  })

  return (
    <FloatingMenu editor={editor} className="bg-neutral-400/80 bg-blend-overlay shadow-md rounded-md p-1 gap-2 flex flex-wrap max-w-md">
      {buttons.map((button) => (
        <Button key={button.label} variant="outline" size="sm-md" onClick={button.onClick}>
          {button.label}
        </Button>
      ))}
    </FloatingMenu>
  )
}
