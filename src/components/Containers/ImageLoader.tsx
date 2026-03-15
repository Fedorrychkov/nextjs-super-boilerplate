'use client'

import Image from 'next/image'
import React, { ReactNode, useEffect, useRef, useState } from 'react'

import { cn } from '~/utils/cn'

import { Skeleton } from '../Loaders'

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  defaultPlaceholder?: ReactNode
  className?: string
  spinnerClassName?: string
  src?: string | null
  isLoading?: boolean
  width?: number
  height?: number
  /**
   * If false, the image will optimized by next.js
   * If you want to use optimization feature, please set up your next.config.js to use available hostnames
   */
  unoptimized?: boolean
}

export const ImageLoader = (props: Props) => {
  const { className, defaultPlaceholder, src, isLoading, spinnerClassName, onClick, unoptimized = true, ...rest } = props || {}

  const [isMediaLoading, setIsMediaLoading] = useState(true)
  const [isMediaError, setMediaError] = useState(isLoading ? false : !src || false)

  const setMediaIsLoaded = () => setIsMediaLoading(false)

  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (src) {
      queueMicrotask(() => {
        setMediaError(false)
      })
    } else {
      queueMicrotask(() => {
        setMediaError(true)
      })
    }
  }, [src])

  useEffect(() => {
    const img = imgRef.current

    /*
			If the image is cached by the browser, the 'onLoad' handler won't work.
			At the same time if the image is cached, 'img.complete' equals true.
		*/
    if (img?.complete || !src) {
      queueMicrotask(() => {
        setMediaIsLoaded()
      })
    }

    let timerId: ReturnType<typeof setInterval> | null = null

    /**
     * If the image is not empty and not loaded, try to get it by interval
     */
    if (img && !img.complete && !isMediaLoading && !isLoading) {
      timerId = setInterval(() => {
        const img = imgRef.current

        if (img?.complete && timerId) {
          setMediaIsLoaded()
          clearInterval(timerId)
        }
      }, 500)
    }

    return () => {
      if (timerId) {
        clearInterval(timerId)
      }
    }
  }, [src, imgRef, isMediaLoading, isLoading])

  const loadingMediaClassName = isMediaLoading || isLoading ? 'hidden' : ''

  if (isMediaError && defaultPlaceholder) {
    return <div className={cn('flex items-center justify-center', className)}>{defaultPlaceholder}</div>
  }

  const isValidEntryProps = rest?.width && rest?.height

  const ImgComponent = isValidEntryProps ? Image : 'img'

  return (
    <>
      {(isMediaLoading || isLoading) && (
        <div className={cn('flex items-center justify-center', className)}>
          {defaultPlaceholder ? (
            <div className={cn('flex items-center justify-center', className)}>{defaultPlaceholder}</div>
          ) : (
            <Skeleton className={cn('w-[24px] h-[24px] rounded-full', spinnerClassName)} />
          )}
        </div>
      )}
      {!isLoading && src && (
        <ImgComponent
          src={src}
          alt="Image"
          {...(isValidEntryProps ? { unoptimized, loading: 'eager' } : {})}
          {...rest}
          className={cn(loadingMediaClassName, className, { 'cursor-pointer': !!onClick })}
          ref={imgRef}
          onLoad={setMediaIsLoaded}
          onError={() => setMediaError(true)}
          onClick={onClick}
        />
      )}
    </>
  )
}
