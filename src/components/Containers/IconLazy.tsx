import { LucideProps } from 'lucide-react'
import dynamicIconImports from 'lucide-react/dynamicIconImports'
import { ErrorBoundary } from 'next/dist/client/components/error-boundary'
import type { ComponentType } from 'react'
import { lazy, memo, Suspense } from 'react'

const lazyIcons = Object.fromEntries(
  (Object.keys(dynamicIconImports) as Array<keyof typeof dynamicIconImports>).map((name) => [
    name,
    lazy(dynamicIconImports[name]) as React.LazyExoticComponent<ComponentType<LucideProps>>,
  ]),
) as Record<keyof typeof dynamicIconImports, React.LazyExoticComponent<ComponentType<LucideProps>>>

interface IconProps extends LucideProps {
  name: keyof typeof dynamicIconImports
  skeleton?: React.ReactNode
  fallback?: React.ReactNode
}

export const IconLazy = memo(({ name, skeleton, fallback, ...props }: IconProps) => {
  const LucideIcon = lazyIcons[name]

  return (
    <ErrorBoundary errorComponent={fallback ? () => fallback : () => null}>
      <Suspense fallback={skeleton}>
        <LucideIcon {...props} />
      </Suspense>
    </ErrorBoundary>
  )
})

IconLazy.displayName = 'IconLazy'
