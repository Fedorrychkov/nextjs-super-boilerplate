import { useMemo, useState } from 'react'

type SwitchHelpers = Record<'on' | 'off' | 'toggle', () => void>

type UseSwitch = (defaultValue: boolean) => [boolean, SwitchHelpers]

export const useSwitch: UseSwitch = (defaultValue = false) => {
  const [isOn, setIsOn] = useState(defaultValue)

  const actions = useMemo(
    () => ({
      on: (e?: React.MouseEvent<HTMLElement>) => {
        e?.preventDefault?.()
        e?.stopPropagation?.()
        setIsOn(true)
      },
      off: (e?: React.MouseEvent<HTMLElement>) => {
        e?.preventDefault?.()
        e?.stopPropagation?.()
        setIsOn(false)
      },
      toggle: (e?: React.MouseEvent<HTMLElement>) => {
        e?.preventDefault?.()
        e?.stopPropagation?.()
        setIsOn((v) => !v)
      },
    }),
    [],
  )

  return [isOn, actions]
}
