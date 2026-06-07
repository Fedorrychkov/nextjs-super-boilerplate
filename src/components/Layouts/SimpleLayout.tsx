import { ThemeShell } from '~/providers/theme'

export const SimpleLayout = ({ children }: { children: React.ReactNode }) => {
  return <ThemeShell className="flex flex-1 flex-col">{children}</ThemeShell>
}
