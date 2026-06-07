import { cn } from '~/utils/cn'

type Props = {
  className?: string
  size?: number
  showText?: boolean
  textClassName?: string
}

/**
 * NSB — Next.js Super Boilerplate logo.
 * Works in both light and dark themes.
 */
export const Logo = ({ className, size = 32, showText = true, textClassName }: Props) => {
  return (
    <span className={cn('flex items-center gap-2 select-none', className)}>
      {/* Icon mark */}
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Background rounded square */}
        <rect width="32" height="32" rx="8" className="fill-foreground" />
        {/* N letter paths */}
        <path d="M7 24V8l10 11V8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="dark:stroke-background" />
        {/* Lightning bolt accent */}
        <path d="M19 14l4-6-2 5h3l-4 7 2-6h-3z" fill="white" className="dark:fill-background" opacity="0.9" />
      </svg>

      {showText && (
        <span className={cn('font-bold tracking-tight text-foreground leading-none', textClassName)}>
          <span className="text-foreground">NSB</span>
          <span className="hidden sm:inline text-muted-foreground font-normal text-xs ml-1">boilerplate</span>
        </span>
      )}
    </span>
  )
}
