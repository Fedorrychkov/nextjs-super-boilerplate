'use client'

import clsx from 'clsx'
import { Property } from 'csstype'
import React from 'react'
import { twMerge } from 'tailwind-merge'

interface SkeletonProps {
  width?: Property.Width | number
  height?: Property.Height | number
  boxHeight?: number
  show?: boolean
  pill?: boolean
  rounded?: boolean
  squared?: boolean
  animated?: boolean
  children?: React.ReactNode
  className?: string
}

export const Skeleton = ({
  width,
  height,
  boxHeight,
  show = true,
  pill = false,
  rounded = false,
  squared = false,
  animated = true,
  children,
  className,
}: SkeletonProps) => {
  return (
    <span
      className={twMerge(
        clsx(
          'block rounded-[5px]',
          !children && show && 'bg-skeleton-gradient bg-[length:400%_100%]',
          children &&
            show &&
            !width &&
            !height &&
            'relative after:absolute after:top-0 after:bottom-0 after:left-0 after:right-0 after:rounded after:bg-skeleton-gradient after:bg-[length:400%_100%]',
          pill && 'rounded-full after:rounded-full',
          rounded && 'rounded-[50%] after:rounded-[50%]',
          squared && 'rounded-none after:rounded-none',
          animated && !children && show && 'animate-skeleton-loading',
          animated && children && show && 'after:animate-skeleton-loading',
          className,
        ),
      )}
      style={{
        minHeight: height || 24,
        width: children ? 'fit-content' : width,
        marginBottom: `calc(${boxHeight || '100%'} - (${typeof height === 'number' ? height : 0}))`,
      }}
    >
      {children}
    </span>
  )
}
