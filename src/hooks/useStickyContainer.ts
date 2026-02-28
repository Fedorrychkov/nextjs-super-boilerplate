import { useEffect, useRef } from 'react'

type StickyDirection = 'top' | 'bottom'

type Props = {
  isEnabled: boolean
  timeout?: number
  direction?: StickyDirection
  elementRef: React.RefObject<HTMLElement | HTMLDivElement | null>
  rootRef: React.RefObject<HTMLElement | HTMLDivElement | null>
}

/**
 * Sticky container works relative to window.scrollY
 * @param {object} props
 * @param {boolean} props.isEnabled - Is the sticky hook enabled
 * @param {number} props.timeout - timeout for animation execution (important to specify or default 150)
 * @param {'top'|'bottom'} props.direction - top: element from the top, sticks to the top of the viewport; bottom: element from the bottom, sticks to the bottom of the viewport
 * @param {React.RefObject<HTMLElement>} props.elementRef - reference to the element that will be moved
 * @param {React.RefObject<HTMLElement>} props.rootRef - reference to the parent element, in which the shift will occur
 * @return {undefined}
 */
export const useStickyContainer = (props: Props) => {
  const { isEnabled = false, timeout = 150, direction = 'top', elementRef, rootRef } = props

  const animationFrameId = useRef<number | null>(null)
  const translateYRef = useRef(0)
  const scrollTimeoutId = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current)
      }

      animationFrameId.current = requestAnimationFrame(() => {
        if (elementRef.current && rootRef.current) {
          const containerRect = rootRef.current.getBoundingClientRect()
          const containerTop = containerRect.top
          const containerBottom = containerRect.bottom
          const windowHeight = window.innerHeight

          if (direction === 'top') {
            if (containerBottom <= 0) {
              translateYRef.current = 0
            } else if (containerTop <= 0) {
              translateYRef.current = -containerTop
            } else {
              translateYRef.current = 0
            }
          } else {
            if (containerTop >= windowHeight) {
              translateYRef.current = 0
            } else if (containerBottom > windowHeight) {
              translateYRef.current = windowHeight - containerBottom
            } else {
              translateYRef.current = 0
            }
          }

          elementRef.current.style.transform = `translateY(${translateYRef.current}px)`
        }
      })

      if (scrollTimeoutId.current !== null) {
        clearTimeout(scrollTimeoutId.current)
      }

      scrollTimeoutId.current = setTimeout(() => {
        if (elementRef.current) {
          elementRef.current.style.transition = 'transform 0.3s ease-in-out'
          elementRef.current.style.transform = `translateY(${translateYRef.current ?? 0}px)`
        }
      }, timeout)
    }

    if (!isEnabled) {
      return () => {
        window.removeEventListener('scroll', handleScroll)

        if (animationFrameId.current !== null) {
          cancelAnimationFrame(animationFrameId.current)
        }

        if (scrollTimeoutId.current !== null) {
          clearTimeout(scrollTimeoutId.current)
        }
      }
    }

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)

      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current)
      }

      if (scrollTimeoutId.current !== null) {
        clearTimeout(scrollTimeoutId.current)
      }
    }
  }, [isEnabled, timeout, direction, elementRef, rootRef])
}
