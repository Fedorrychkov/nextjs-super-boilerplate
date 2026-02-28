'use client'

import 'react-json-pretty/themes/monikai.css'

import { useState } from 'react'
import JSONPretty from 'react-json-pretty'

import { cn } from '~/utils/cn'

import { Button } from '../ui'
import { CopyContainer } from './CopyContainer'

export const PrettyContainer = ({
  title,
  content,
  description,
  children,
  hasError,
  successNotifyText,
  isCode,
  className,
}: {
  title?: React.ReactNode
  content?: string
  description?: string
  successNotifyText?: string
  hasError?: boolean
  isCode?: boolean
  children?: React.ReactNode | null
  language?: string
  className?: string
}) => {
  const [breakWordEnabled, setBreakWordEnabled] = useState(false)

  if (!content && !description && !children) return null

  return (
    <div className={cn('flex flex-col gap-2', className)} onClick={(e) => e.stopPropagation?.()}>
      {title && typeof title === 'string' && <p className="text-md font-semibold">{title}</p>}
      {title && typeof title !== 'string' && title}

      {children}

      {content && (
        <CopyContainer
          buttonClassName="absolute top-[2px] right-[2px] bg-white w-[28px] h-[28px] p-1 flex items-center justify-center rounded-lg"
          className="relative [&>[data-copy-control='1']]:hidden [&>[data-break-word-control='1']]:hidden [&:hover>[data-copy-control='1']]:flex [&:hover>[data-break-word-control='1']]:flex"
          content={content}
          successNotifyText={successNotifyText}
        >
          {isCode ? (
            <PrettyBox className="mb-1 overflow-hidden w-full rounded-lg" breakWordEnabled={breakWordEnabled} hasError={hasError}>
              empty
            </PrettyBox>
          ) : (
            <PrettyBox
              className="mb-1 overflow-hidden w-full rounded-lg"
              breakWordEnabled={breakWordEnabled}
              hasError={hasError}
              onClick={(e) => e.stopPropagation?.()}
            >
              <JSONPretty className="overflow-y-auto" data={content} />
            </PrettyBox>
          )}
          <Button
            data-break-word-control="1"
            className="absolute top-[2px] right-[32px] bg-white w-[28px] h-[28px] !p-0 flex items-center justify-center rounded-lg"
            onClick={(e) => {
              e.stopPropagation?.()
              setBreakWordEnabled(!breakWordEnabled)
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" width={18} height={18}>
              <path
                fill={!breakWordEnabled ? '#464455' : 'blue'}
                d="M4 19h6v-2H4v2zM20 5H4v2h16V5zm-3 6H4v2h13.25c1.1 0 2 .9 2 2s-.9 2-2 2H15v-2l-3 3l3 3v-2h2c2.21 0 4-1.79 4-4s-1.79-4-4-4z"
              ></path>
            </svg>
          </Button>
        </CopyContainer>
      )}
    </div>
  )
}

export const PrettyBox = ({
  hasError,
  breakWordEnabled,
  className,
  children,
  onClick,
}: {
  hasError?: boolean
  breakWordEnabled?: boolean
  className?: string
  children?: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
}) => {
  return (
    <div
      onClick={onClick}
      className={cn('relative pretty-box-custom', hasError && 'pretty-box-error', breakWordEnabled && 'whitespace-pre-wrap break-words', className)}
    >
      {children}
    </div>
  )
}
