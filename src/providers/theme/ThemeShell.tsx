import { cn } from '~/utils/cn'

type Props = {
  children: React.ReactNode
  className?: string
}

/**
 * Page shell: semantic background/foreground from CSS variables (`globals.css` + `.dark` on `<html>`).
 */
export function ThemeShell({ children, className }: Props) {
  return <div className={cn('min-h-full w-full bg-background text-foreground', className)}>{children}</div>
}
