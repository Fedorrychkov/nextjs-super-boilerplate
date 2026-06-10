'use client'

import type { OAuthProviderId } from '@config/auth-oauth'

import { getOAuthProviderIconSrc } from '~/lib/auth/oauth-provider-icons'
import { cn } from '~/utils/cn'

type IconProps = {
  provider: OAuthProviderId
  size?: number
  className?: string
}

export function OAuthProviderIcon({ provider, size = 20, className }: IconProps) {
  const src = getOAuthProviderIconSrc(provider)

  if (!src) {
    return null
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- small static brand SVG from /public
    <img src={src} alt="" width={size} height={size} className={cn('shrink-0 object-contain', provider === 'github' && 'dark:invert', className)} aria-hidden />
  )
}

type CircleButtonProps = {
  provider: OAuthProviderId
  label: string
  disabled?: boolean
  onClick: () => void
  size?: 'md' | 'lg'
}

export function OAuthProviderCircleButton({ provider, label, disabled, onClick, size = 'lg' }: CircleButtonProps) {
  const dimension = size === 'lg' ? 'h-12 w-12' : 'h-10 w-10'
  const iconSize = size === 'lg' ? 24 : 20

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors',
        'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        dimension,
      )}
    >
      <OAuthProviderIcon provider={provider} size={iconSize} />
    </button>
  )
}
