'use client'

import { useRef } from 'react'

import { StickyContainer } from '~/components/Containers'
import { Typography } from '~/components/ui'
import { useStickyContainer } from '~/hooks/useStickyContainer'

export const Sticky = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  useStickyContainer({
    elementRef: headerRef,
    rootRef: containerRef,
    isEnabled: true,
    direction: 'top',
  })

  useStickyContainer({
    elementRef: footerRef,
    rootRef: containerRef,
    isEnabled: true,
    direction: 'bottom',
  })

  return (
    <div ref={containerRef} className="flex flex-col min-h-[400px] gap-4">
      <StickyContainer ref={headerRef} direction="bottom">
        <div>
          <Typography variant="Body/M/Regular">Sticky Top</Typography>
        </div>
      </StickyContainer>
      <div className="flex flex-col gap-4 min-h-[400px] bg-slate-400">
        <Typography variant="Body/M/Regular">Content</Typography>
      </div>
      <StickyContainer ref={footerRef} direction="top">
        <div>
          <Typography variant="Body/M/Regular">Sticky Bottom</Typography>
        </div>
      </StickyContainer>
    </div>
  )
}
