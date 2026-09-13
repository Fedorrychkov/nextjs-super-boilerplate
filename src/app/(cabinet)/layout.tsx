import { PlatformLayout } from '~/components/Layouts'

/**
 * ONE layout for the whole cabinet: a route group, not a copy per section. The parentheses in
 * the folder name do not appear in the URL. With a layout per section, Next treated
 * /admin → /profile as different subtrees: the sidebar was unmounted and mounted again on every
 * move, losing its open sections and scroll position and refetching navigation data.
 */
export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  return <PlatformLayout>{children}</PlatformLayout>
}
