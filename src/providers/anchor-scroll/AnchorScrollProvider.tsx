'use client'

import { useCallback, useEffect, useMemo } from 'react'

import { AnchorScrollContext } from './context'

const HEADER_OFFSET_PX = 72

const getAnchorId = (hashOrId: string) => hashOrId.replace(/^#/, '').trim()

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const AnchorScrollProvider = ({ children }: { children: React.ReactNode }) => {
  const scrollToAnchor = useCallback((hashOrId: string) => {
    const anchorId = getAnchorId(hashOrId)

    if (!anchorId) return

    const target = document.getElementById(anchorId)

    if (!target) return

    const targetTop = window.scrollY + target.getBoundingClientRect().top - HEADER_OFFSET_PX
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }, [])

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target

      if (!(target instanceof Element)) return

      const anchor = target.closest('a[href]')

      if (!(anchor instanceof HTMLAnchorElement)) return

      const href = anchor.getAttribute('href')

      if (!href) return

      const isHashOnly = href.startsWith('#')
      const samePathWithHash = href.startsWith(`${window.location.pathname}#`)

      if (!isHashOnly && !samePathWithHash) return

      const hash = isHashOnly ? href : href.slice(window.location.pathname.length)
      const anchorId = getAnchorId(hash)

      if (!anchorId) return

      if (!document.getElementById(anchorId)) return

      event.preventDefault()
      scrollToAnchor(anchorId)
      window.history.pushState(null, '', `#${anchorId}`)
    }

    document.addEventListener('click', onDocumentClick)

    return () => document.removeEventListener('click', onDocumentClick)
  }, [scrollToAnchor])

  useEffect(() => {
    if (!window.location.hash) return

    const timeoutId = window.setTimeout(() => {
      scrollToAnchor(window.location.hash)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [scrollToAnchor])

  const value = useMemo(
    () => ({
      scrollToAnchor,
    }),
    [scrollToAnchor],
  )

  return <AnchorScrollContext.Provider value={value}>{children}</AnchorScrollContext.Provider>
}
