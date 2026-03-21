import { Editor } from '@tiptap/react'
import { useMemo } from 'react'

import { features } from '../editor.types'
import { getFeatureConfig } from '../util'

type Props = {
  editor: Editor
  enabledFeautures?: (typeof features)[number][]
  disabledFeatures?: (typeof features)[number][]
}

export const useMenuConfigs = (props: Props) => {
  const { editor, enabledFeautures = [], disabledFeatures = [] } = props

  const enabledFeatures = useMemo(() => {
    const filteredFeatures = features.filter((feature) => enabledFeautures.includes(feature) && !disabledFeatures.includes(feature))

    return filteredFeatures
  }, [enabledFeautures, disabledFeatures])

  const buttonConfigs = useMemo(() => {
    return enabledFeatures.map((feature) => getFeatureConfig(editor)?.[feature])
  }, [enabledFeatures, editor])

  return {
    buttons: buttonConfigs,
  }
}
