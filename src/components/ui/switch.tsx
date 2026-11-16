'use client'

import { cn } from '~/utils/cn'

type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

/**
 * An on/off control for a setting that takes effect as a state, not a choice in a list. A checkbox
 * reads as "pick this"; a switch reads as "this is on". Native `button role="switch"`: Space and
 * Enter toggle it, a `<label htmlFor>` points at it, screen readers announce on/off.
 */
export const Switch = ({ checked, onCheckedChange, disabled, id, className, ...aria }: SwitchProps) => (
  <button
    type="button"
    role="switch"
    id={id}
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:cursor-not-allowed disabled:opacity-50',
      checked ? 'bg-primary' : 'bg-input dark:bg-muted-foreground/40 border-border',
      className,
    )}
    {...aria}
  >
    <span
      aria-hidden
      className={cn(
        'pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform',
        checked ? 'translate-x-4' : 'translate-x-0.5',
      )}
    />
  </button>
)
