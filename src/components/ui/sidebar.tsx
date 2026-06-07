'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { User } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Fragment, useState } from 'react'

import { useAuth, useT } from '~/providers'
import { cn } from '~/utils/cn'
import { matchesPathname } from '~/utils/matchPath'

import { Skeleton } from '../Loaders'
import { Logo } from './Logo'

const AnimatedMenuToggle = ({ toggle, isOpen }: { toggle: () => void; isOpen: boolean }) => (
  <button onClick={toggle} aria-label="Toggle menu" className="focus:outline-none z-999">
    <motion.div animate={{ y: isOpen ? 13 : 0 }} transition={{ duration: 0.3 }}>
      <motion.svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        initial="closed"
        animate={isOpen ? 'open' : 'closed'}
        transition={{ duration: 0.3 }}
        className="text-foreground"
      >
        <motion.path
          fill="transparent"
          strokeWidth="3"
          stroke="currentColor"
          strokeLinecap="round"
          variants={{
            closed: { d: 'M 2 2.5 L 22 2.5' },
            open: { d: 'M 3 16.5 L 17 2.5' },
          }}
        />
        <motion.path
          fill="transparent"
          strokeWidth="3"
          stroke="currentColor"
          strokeLinecap="round"
          variants={{
            closed: { d: 'M 2 12 L 22 12', opacity: 1 },
            open: { opacity: 0 },
          }}
          transition={{ duration: 0.2 }}
        />
        <motion.path
          fill="transparent"
          strokeWidth="3"
          stroke="currentColor"
          strokeLinecap="round"
          variants={{
            closed: { d: 'M 2 21.5 L 22 21.5' },
            open: { d: 'M 3 2.5 L 17 16.5' },
          }}
        />
      </motion.svg>
    </motion.div>
  </button>
)

const CollapsibleSection = ({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen || false)

  return (
    <>
      <button className="w-full flex items-center justify-between py-2 px-4 rounded-xl hover:bg-muted" onClick={() => setOpen(!open)}>
        <span className="font-semibold text-md text-left">{title}</span>
        {open ? <XIcon /> : <MenuIcon />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

const MenuIcon = () => (
  <motion.svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
    <motion.line x1="3" y1="12" x2="21" y2="12" />
  </motion.svg>
)

const XIcon = () => (
  <motion.svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
    <motion.line x1="18" y1="6" x2="6" y2="18" />
    <motion.line x1="6" y1="6" x2="18" y2="18" />
  </motion.svg>
)

const Footer = () => {
  const t = useT()

  const router = useRouter()
  const handleLogout = () => {
    router.replace('/logout')
  }

  return (
    <div className="p-4 border-t border-border">
      <button
        onClick={handleLogout}
        className="w-full cursor-pointer font-medium text-sm p-2 text-center bg-blue-100 dark:bg-blue-900 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-800"
      >
        {t('common.signOut')}
      </button>
    </div>
  )
}

const ProfileSection = () => {
  const router = useRouter()

  const { authUser, isLoading, isFetched } = useAuth()

  return (
    <div className="border-b border-border">
      {/* Logo → home */}
      <Link href="/" className="flex items-center gap-2 px-4 py-3 hover:bg-muted transition-colors">
        <Logo size={24} showText />
      </Link>
      {/* User profile row */}
      <div className="px-4 py-3 border-t border-border/50">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/profile')}>
          <div className="w-8 min-w-8 h-8 min-h-8 dark:bg-muted-foreground bg-slate-100 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 min-w-4 min-h-4" />
          </div>
          <div className="w-full overflow-hidden">
            {isLoading || !isFetched ? (
              <Skeleton width="100%" height={20} />
            ) : (
              <p className="text-xs text-muted-foreground truncate">{authUser?.email ?? 'Anonymous'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export type NavigationItem = {
  label: string
  icon: React.ReactNode
  content?: React.ReactNode
  title?: string
  disabled?: boolean
  href?: string
  onClick?: () => void
  items?: NavigationItem[]
}

export type NavigationSection = {
  title?: string
  items?: NavigationItem[]
  disabled?: boolean
  content?: React.ReactNode
  extra?: boolean
  defaultOpen?: boolean
}

const NavigationSection = ({ navigation, toggle }: { navigation: NavigationSection[]; toggle: () => void }) => {
  const pathname = usePathname()

  if (!navigation?.length) {
    return (
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="flex flex-col gap-2">
          <li className="flex flex-col gap-2">
            <Skeleton width="100%" height={40} />
            <Skeleton width="100%" height={40} />
            <Skeleton width="100%" height={40} />
          </li>
          <li className="flex flex-col gap-2">
            <Skeleton width="100%" height={40} />
          </li>
        </ul>
      </nav>
    )
  }

  return (
    <nav className="flex-1 p-4 overflow-y-auto">
      <ul className="flex flex-col gap-2">
        {navigation
          ?.filter((nav) => !nav.disabled)
          .map((nav) => {
            if (nav.extra) {
              return (
                <li key={nav.title} className="flex flex-col gap-2">
                  <CollapsibleSection defaultOpen={nav.defaultOpen} title={nav.title || ''}>
                    {nav.items ? (
                      <ul className="flex flex-col gap-2">
                        {nav.items
                          ?.filter((item) => !item.disabled)
                          .map((item) => (
                            <li key={item.label}>
                              <Link
                                onClick={toggle}
                                href={item.href || ''}
                                className={cn(
                                  'w-full text-muted-foreground font-medium text-sm flex flex-start items-center gap-2 text-left p-2 rounded-xl hover:bg-muted',
                                  {
                                    'bg-muted text-foreground': matchesPathname(item.href || '', pathname),
                                  },
                                )}
                              >
                                {item.icon}
                                {item.label}
                              </Link>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">{nav.content}</p>
                    )}
                  </CollapsibleSection>
                </li>
              )
            }

            return (
              <Fragment key={nav.title}>
                {nav.items
                  ?.filter((item) => !item.disabled)
                  .map((item) => (
                    <li key={item.label}>
                      <Link
                        onClick={toggle}
                        href={item.href || ''}
                        className={cn(
                          'w-full text-muted-foreground font-medium text-sm flex flex-start items-center gap-2 text-left p-2 rounded-xl hover:bg-muted',
                          {
                            'bg-muted text-foreground': matchesPathname(item.href || '', pathname),
                          },
                        )}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    </li>
                  ))}
              </Fragment>
            )
          })}
      </ul>
    </nav>
  )
}

type SidebarProps = {
  children: React.ReactNode
  navigation?: NavigationSection[]
}

const Sidebar = ({ children, navigation }: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const mobileSidebarVariants = {
    hidden: { x: '-100%' },
    visible: { x: 0 },
  }

  const toggleSidebar = () => setIsOpen(!isOpen)

  return (
    <div className="flex overflow-hidden">
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={mobileSidebarVariants}
            transition={{ duration: 0.3 }}
            className="md:hidden max-w-[100vw] fixed inset-0 z-50 bg-background text-foreground"
          >
            <div className="flex flex-col h-full">
              {/* Profile Section */}
              <ProfileSection />
              {/* Navigation Section */}
              <NavigationSection navigation={navigation || []} toggle={toggleSidebar} />
              {/* Footer / Action Button */}
              <Footer />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-full bg-background text-foreground shadow dark:shadow-foreground/30 max-w-[200px] w-full">
        {/* Profile Section */}
        <ProfileSection />
        {/* Navigation Section */}
        <NavigationSection navigation={navigation || []} toggle={toggleSidebar} />
        {/* Footer / Action Button */}
        <Footer />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-0 md:ml-[200px] transition-all overflow-hidden duration-300 flex-col flex">
        {/* Top bar for mobile toggle */}
        <div className="p-4 bg-background border-b border-border md:hidden flex justify-end items-center">
          <AnimatedMenuToggle toggle={toggleSidebar} isOpen={isOpen} />
        </div>
        <div className="md:p-6 p-2 flex-1 flex flex-col max-w-[100vw]">{children}</div>
      </div>
    </div>
  )
}

export { Sidebar }
