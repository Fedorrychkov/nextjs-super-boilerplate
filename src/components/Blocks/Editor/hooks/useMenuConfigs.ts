'use client'

import { Editor } from '@tiptap/react'
import { useMemo } from 'react'

import { useT } from '~/providers'

import { features } from '../editor.types'
import { type FeatureConfigOptions, getFeatureConfig } from '../util'

type Props = {
  editor: Editor
  enabledFeautures?: (typeof features)[number][]
  disabledFeatures?: (typeof features)[number][]
  featureOptions?: FeatureConfigOptions
}

export const useMenuConfigs = (props: Props) => {
  const t = useT()

  const { editor, enabledFeautures = [], disabledFeatures = [], featureOptions } = props

  const enabledFeatures = useMemo(() => {
    const filteredFeatures = features.filter((feature) => enabledFeautures.includes(feature) && !disabledFeatures.includes(feature))

    return filteredFeatures
  }, [enabledFeautures, disabledFeatures])

  const buttonConfigs = useMemo(() => {
    return enabledFeatures.map((feature) => getFeatureConfig(editor, featureOptions, t)?.[feature])
  }, [enabledFeatures, editor, featureOptions, t])

  return {
    buttons: buttonConfigs,
  }
}
