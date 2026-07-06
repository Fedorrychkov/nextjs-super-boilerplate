'use client'

import { useMemo, useState } from 'react'

import { API_TOKEN_KINDS, API_TOKEN_SCOPES, type ApiTokenKind, type ApiTokenRolePolicyModel, type ApiTokenScope } from '~/api/api-token'
import { API_TOKEN_DEFAULT_EXPIRES_DAYS } from '~/api/api-token/permissions'
import { UserRole } from '~/api/user'
import { Typography } from '~/components/ui'
import { Button } from '~/components/ui/button'
import { Checkbox, Input, Label } from '~/components/ui/fields'
import type { AppMessageKey } from '~/lib/i18n'
import { useT } from '~/providers'
import { useApiTokenPoliciesQuery, useApiTokenPolicyUpdateMutation } from '~/query/api-token'

type RowProps = {
  role: string
  policy?: ApiTokenRolePolicyModel
}

const RolePolicyRow = ({ role, policy }: RowProps) => {
  const t = useT()

  const [enabled, setEnabled] = useState(policy?.enabled ?? false)
  const [scopes, setScopes] = useState<ApiTokenScope[]>(policy?.allowedScopes ?? [])
  const [kinds, setKinds] = useState<ApiTokenKind[]>(policy?.allowedKinds ?? [...API_TOKEN_KINDS])
  const [maxDays, setMaxDays] = useState(policy?.maxExpiresDays ?? API_TOKEN_DEFAULT_EXPIRES_DAYS)

  const { apiTokenPolicyUpdateMutation } = useApiTokenPolicyUpdateMutation()

  const toggleScope = (scope: ApiTokenScope) => {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]))
  }

  const toggleKind = (kind: ApiTokenKind) => {
    setKinds((prev) => (prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind]))
  }

  const onSave = () => {
    apiTokenPolicyUpdateMutation.mutate({
      role,
      enabled,
      allowedScopes: scopes,
      allowedKinds: kinds,
      maxExpiresDays: maxDays,
    })
  }

  const isInvalid = enabled && (!scopes.length || !kinds.length)

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-row items-center justify-between gap-2">
        <Label className="flex flex-row items-center gap-2 cursor-pointer">
          <Checkbox checked={enabled} onCheckedChange={() => setEnabled((v) => !v)} disabled={apiTokenPolicyUpdateMutation.isLoading} />
          <Typography variant="Body/M/Semibold">{role}</Typography>
        </Label>
        <Button size="sm" onClick={onSave} disabled={apiTokenPolicyUpdateMutation.isLoading || isInvalid} isLoading={apiTokenPolicyUpdateMutation.isLoading}>
          {t('apiTokens.policy.save')}
        </Button>
      </div>

      <div className="flex flex-row flex-wrap gap-x-4 gap-y-2">
        {API_TOKEN_SCOPES.map((scope) => (
          <Label key={scope} className="flex flex-row items-center gap-2 cursor-pointer">
            <Checkbox
              checked={scopes.includes(scope)}
              onCheckedChange={() => toggleScope(scope)}
              disabled={apiTokenPolicyUpdateMutation.isLoading || !enabled}
            />
            <Typography variant="Body/S/Regular">{scope}</Typography>
          </Label>
        ))}
      </div>

      <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-2">
        <Typography variant="Body/S/Regular" className="text-muted-foreground">
          {t('apiTokens.policy.kinds')}
        </Typography>
        {API_TOKEN_KINDS.map((kind) => (
          <Label key={kind} className="flex flex-row items-center gap-2 cursor-pointer">
            <Checkbox checked={kinds.includes(kind)} onCheckedChange={() => toggleKind(kind)} disabled={apiTokenPolicyUpdateMutation.isLoading || !enabled} />
            <Typography variant="Body/S/Regular">{t(`apiTokens.policy.kind_${kind}` as AppMessageKey)}</Typography>
          </Label>
        ))}
      </div>

      <div className="flex flex-row items-center gap-2">
        <Typography variant="Body/S/Regular" className="text-muted-foreground">
          {t('apiTokens.policy.maxExpiresDays')}
        </Typography>
        <Input
          type="number"
          className="w-24"
          min={1}
          max={365}
          value={maxDays}
          disabled={apiTokenPolicyUpdateMutation.isLoading || !enabled}
          onChange={(event) => setMaxDays(Number(event.target.value) || API_TOKEN_DEFAULT_EXPIRES_DAYS)}
        />
      </div>

      {isInvalid && (
        <Typography variant="Body/XS/Regular" className="text-destructive">
          {t('apiTokens.errors.scopesRequired' as AppMessageKey)}
        </Typography>
      )}
    </div>
  )
}

/**
 * Admin-only card: which roles may issue API tokens, with which scopes and max lifetime.
 * Renders every role from `UserRole` (except admin) plus any policy roles stored in the DB —
 * so downstream projects with custom roles manage them here without code changes.
 */
export const RolePoliciesCard = () => {
  const t = useT()

  const { data, isLoading } = useApiTokenPoliciesQuery()

  const roles = useMemo(() => {
    const known = Object.values(UserRole).filter((role) => role !== UserRole.ADMIN) as string[]
    const fromPolicies = (data?.list ?? []).map((policy) => policy.role)

    return [...new Set([...known, ...fromPolicies])]
  }, [data?.list])

  if (isLoading) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 md:px-8 px-1">
      <Typography variant="Body/M/Semibold">{t('apiTokens.policy.title')}</Typography>
      <Typography variant="Body/S/Regular" className="text-muted-foreground">
        {t('apiTokens.policy.hint')}
      </Typography>
      <div className="flex flex-col gap-3">
        {roles.map((role) => (
          <RolePolicyRow
            key={`${role}:${data?.list?.find((p) => p.role === role)?.updatedAt ?? 'new'}`}
            role={role}
            policy={data?.list?.find((p) => p.role === role)}
          />
        ))}
      </div>
    </div>
  )
}
