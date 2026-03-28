'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { Button, Typography } from '~/components/ui'
import { cn } from '~/utils/cn'

export type Tab = {
  label: React.ReactNode
  value: string
  icon?: React.ReactNode
  children?: React.ReactNode
  className?: string
  isEnabled?: boolean
  onClick?: () => void
}

type Props = {
  className?: string
  tabs: Tab[]
  activeTab?: string | null
  searchMutable?: boolean
  currentTab?: string | null
  /**
   * @default 'lazy'
   * @description
   * - 'now' - render tab immediately
   * - 'lazy' - render tab after first selection
   */
  mode?: 'now' | 'lazy'
  onTabChange?: (tabValue: string) => void
}

export const TabsContainer = (props: Props) => {
  const { className, tabs, activeTab: activeTabProp, searchMutable = true, onTabChange, currentTab, mode = 'lazy' } = props
  const searchParamsState = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [activatedTabs, setActivatedTabs] = useState<string[]>([activeTabProp ?? tabs?.[0]?.value ?? ''])
  const [activeTab, setActiveTab] = useState<string>(activeTabProp ?? tabs?.[0]?.value ?? '')

  useEffect(() => {
    queueMicrotask(() => {
      setActivatedTabs((state) => [...state, currentTab ?? tabs?.[0]?.value ?? ''])
    })
  }, [currentTab, tabs])

  const handleActivateTab = (tabValue: string) => {
    setActivatedTabs([...activatedTabs, tabValue])
    setActiveTab(tabValue)
    onTabChange?.(tabValue)

    if (searchMutable) {
      const searchParams = new URLSearchParams(searchParamsState.toString())
      searchParams.set('activeTab', tabValue)

      router.replace(`${pathname}?${searchParams.toString()}`)
    }
  }

  const finalActiveTab = useMemo(() => {
    return currentTab ?? activeTab
  }, [currentTab, activeTab])

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-row gap-2 flex-wrap">
        {tabs.map(({ isEnabled = true, ...tab }) => (
          <Button
            key={tab.value}
            disabled={!isEnabled}
            variant={finalActiveTab === tab.value ? 'default' : 'secondary'}
            className="flex flex-row gap-2"
            onClick={() => {
              if (tab.onClick) {
                tab.onClick()

                return
              }

              handleActivateTab(tab.value)
            }}
          >
            {tab.icon}
            {typeof tab.label === 'string' ? (
              <Typography
                variant="Body/S/Regular"
                className={cn('whitespace-nowrap text-nowrap text-neutral', {
                  'text-neutral': finalActiveTab === tab.value,
                  'text-neutral-1000': finalActiveTab !== tab.value,
                })}
              >
                {tab.label}
              </Typography>
            ) : (
              tab.label
            )}
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {tabs.map((tab) => {
          const isActivated = mode === 'lazy' ? activatedTabs.includes(tab.value) : true

          const isActive = finalActiveTab === tab.value

          if (!isActivated || !tab?.children) return null

          return (
            <div
              key={tab.value}
              className={cn('flex flex-col gap-2', {
                hidden: !isActive,
                flex: isActive,
              })}
            >
              {tab?.children}
            </div>
          )
        })}
      </div>
    </div>
  )
}
