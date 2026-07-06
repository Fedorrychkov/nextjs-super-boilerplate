'use client'

import { lazy, Suspense, useRef, useState } from 'react'

import type { ApiTokenCreatePayload } from '~/api/api-token'
import { TitleWithBadge } from '~/components/Blocks/TitleWithBadge'
import { StickyContainer } from '~/components/Containers'
import { PaginationSkeleton } from '~/components/List'
import { usePagination } from '~/components/List/usePagination'
import { Typography } from '~/components/ui'
import { Button } from '~/components/ui/button'
import { useStickyContainer } from '~/hooks/useStickyContainer'
import { useT } from '~/providers'
import { useApiTokenCreateMutation, useApiTokenPermissionsQuery, useApiTokenRevokeMutation, useApiTokensQuery } from '~/query/api-token'

import { McpSetupInstructions } from '../Instructions/McpSetupInstructions'
import { ApiTokensTable } from '../List/ApiTokensTable'
import { CreateApiTokenDialog } from '../Modal/CreateApiTokenDialog'
import { RolePoliciesCard } from '../Policy/RolePoliciesCard'

const PaginationLazy = lazy(() => import('~/components/List').then((mod) => ({ default: mod.Pagination })))

type Props = {
  /** `admin` — all tokens + role policies; `user` — own tokens only, gated by the role policy. */
  variant?: 'admin' | 'user'
}

export const ApiTokensScreen = ({ variant = 'admin' }: Props) => {
  const t = useT()
  const headerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const paginationRef = useRef<HTMLDivElement>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  useStickyContainer({ isEnabled: true, elementRef: headerRef, rootRef: containerRef })
  useStickyContainer({ isEnabled: true, elementRef: paginationRef, rootRef: containerRef, direction: 'bottom' })

  const { page, setPage, offset } = usePagination({ limit: 25 })

  const { data: permissions, isLoading: isPermissionsLoading } = useApiTokenPermissionsQuery()

  const isAllowed = Boolean(permissions?.allowed)

  const { data, isLoading } = useApiTokensQuery({ limit: 25, offset }, variant === 'admin' || isAllowed)
  const { apiTokenCreateMutation } = useApiTokenCreateMutation()
  const { apiTokenRevokeMutation } = useApiTokenRevokeMutation()

  const onCreate = async (payload: ApiTokenCreatePayload) => {
    return apiTokenCreateMutation.mutateAsync(payload)
  }

  const onRevoke = (id: string) => {
    apiTokenRevokeMutation.mutate(id)
  }

  // User variant: the role policy may forbid tokens entirely.
  if (variant === 'user' && !isPermissionsLoading && !isAllowed) {
    return (
      <div className="flex flex-col gap-4 md:px-8 md:py-4 py-2 px-1">
        <TitleWithBadge title={t('apiTokens.title')} />
        <Typography variant="Body/M/Regular" className="text-muted-foreground">
          {t('apiTokens.notAllowedForRole')}
        </Typography>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4" ref={containerRef}>
      <StickyContainer ref={headerRef} className="flex flex-row gap-4 items-center justify-between md:px-8 md:py-4 py-2 px-1">
        <TitleWithBadge title={t('apiTokens.title')} badgeContent={<Typography variant="Body/XS/Regular">{data?.count ?? 0}</Typography>} />
        <CreateApiTokenDialog
          // Remount when the allowed scope set arrives/changes so the default selection stays valid.
          key={permissions?.allowedScopes?.join(',') || 'all'}
          isOpen={isCreateOpen}
          toggle={() => setIsCreateOpen((v) => !v)}
          isLoading={apiTokenCreateMutation.isLoading}
          onSubmit={onCreate}
          allowedScopes={permissions?.allowedScopes?.length ? permissions.allowedScopes : undefined}
          maxExpiresDays={permissions?.maxExpiresDays || undefined}
        >
          <Button disabled={isPermissionsLoading}>{t('apiTokens.create')}</Button>
        </CreateApiTokenDialog>
      </StickyContainer>

      {variant === 'admin' && <RolePoliciesCard />}

      <McpSetupInstructions isAdmin={variant === 'admin'} />

      <ApiTokensTable items={data?.list} isLoading={isLoading} onRevoke={onRevoke} isRevoking={apiTokenRevokeMutation.isLoading} />

      <StickyContainer ref={paginationRef} className="md:px-8 md:py-4 py-2 px-1">
        <Suspense fallback={<PaginationSkeleton />}>
          <PaginationLazy currentPage={page} pages={data?.pages ?? 0} onChange={setPage} />
        </Suspense>
      </StickyContainer>
    </div>
  )
}
