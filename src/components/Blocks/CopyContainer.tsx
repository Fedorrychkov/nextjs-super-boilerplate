'use client'

import { CopyCheckIcon, CopyIcon } from 'lucide-react'
import { ReactNode, useCallback, useState } from 'react'

import { useNotify } from '~/providers/notify'
import { cn } from '~/utils/cn'
import { cp } from '~/utils/cp'

type Props = {
  children: ReactNode
  content?: string | null
  successNotifyText?: string
  className?: string
  buttonClassName?: string
  withIcon?: boolean
}

export const CopyContainer = (props: Props) => {
  const { children, content, successNotifyText, className, withIcon = true, buttonClassName } = props

  const [isCopied, setCopied] = useState(false)
  const { notify } = useNotify()

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation?.()

      if (!content) return

      cp.copy(content)
      notify(successNotifyText || 'Successfully copied', 'success')
      setCopied(true)

      setTimeout(() => setCopied(false), 1000)
    },
    [content, successNotifyText, notify],
  )

  return (
    <span className={cn('flex gap-2 items-center', className)} onClick={handleCopy}>
      {children}
      {withIcon && !!content && (
        <>
          {isCopied ? (
            <CopyCheckIcon data-copy-control="1" className={cn('min-w-[12px] w-[12px] shrink-0', buttonClassName)} />
          ) : (
            <CopyIcon data-copy-control="1" className={cn('cursor-pointer min-w-[12px] w-[12px] shrink-0', buttonClassName)} />
          )}
        </>
      )}
    </span>
  )
}
