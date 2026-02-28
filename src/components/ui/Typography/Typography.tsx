import type React from 'react'
import type { FC } from 'react'

import { cn } from '~/utils/cn'

type Variant =
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'Body/L/Regular'
  | 'Body/L/Semibold'
  | 'Body/M/Regular'
  | 'Body/M/Semibold'
  | 'Body/S/Regular'
  | 'Body/S/Semibold'
  | 'Body/XS/Regular'
  | 'Body/XS/Semibold'

type Props = {
  children: React.ReactNode
  className?: string
  variant?: Variant
  asTag?: 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'a' | 'label'
  href?: string
  target?: '_blank' | '_self' | '_parent' | '_top'
  htmlFor?: string
}

export const Typography: FC<Props> = ({ children, className, variant, asTag = 'p', href, target, htmlFor }) => {
  const variantClasses: Record<Variant, string> = {
    'heading-1': 'md:text-4xl tracking-[4%] font-[700] text-6xl',
    'heading-2': 'md:text-2xl md:tracking-[2%] tracking-[4%] font-[700] text-4xl',
    'heading-3': ' font-[700] md:text-2xl tracking-[2%] text-lg',
    'Body/L/Regular': 'font-[400] text-xl md:text-lg tracking-[-0.5%]',
    'Body/L/Semibold': 'font-[600] text-xl md:text-lg tracking-[-0.5%]',
    'Body/M/Regular': 'font-[400] text-base tracking-[-0.5%]',
    'Body/M/Semibold': 'font-[600] text-base tracking-[-0.5%]',
    'Body/S/Regular': 'font-[400] text-sm tracking-[-0.5%]',
    'Body/S/Semibold': 'font-[600] text-sm tracking-[-0.5%]',
    'Body/XS/Regular': 'font-[400] text-xs tracking-[-0.5%]',
    'Body/XS/Semibold': 'font-[600] text-xs tracking-[-0.5%]',
  }

  const Tag = asTag

  const SafetyTag = href ? 'a' : Tag

  return (
    <SafetyTag
      href={href}
      htmlFor={htmlFor}
      target={target}
      data-font-size={variant}
      className={cn('font-[400] text-xl text-slate-800 dark:text-slate-100', variantClasses[variant ?? 'Body/M/Regular'], className)}
    >
      {children}
    </SafetyTag>
  )
}
