'use client'

import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { API_TOKEN_DEFAULT_SCOPES, API_TOKEN_SCOPES, type ApiTokenCreatedModel, type ApiTokenCreatePayload, type ApiTokenScope } from '~/api/api-token'
import { API_TOKEN_ABSOLUTE_MAX_EXPIRES_DAYS, API_TOKEN_DEFAULT_EXPIRES_DAYS } from '~/api/api-token/permissions'
import { DefaultFieldContainer } from '~/components/Fields'
import { Typography } from '~/components/ui'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog'
import { Checkbox, Label } from '~/components/ui/fields'
import { useRegister } from '~/hooks/useRegister'
import type { AppMessageKey } from '~/lib/i18n'
import { useT } from '~/providers'

type FormValues = {
  name: string
  expiresInDays: number
}

type Props = {
  children: React.ReactNode
  isOpen?: boolean
  isLoading?: boolean
  toggle?: () => void
  onSubmit?: (payload: ApiTokenCreatePayload) => Promise<ApiTokenCreatedModel | undefined>
  /** Scopes the current user's role policy allows (default: all — admin). */
  allowedScopes?: readonly ApiTokenScope[]
  /** Max token lifetime allowed by the role policy (default: absolute cap). */
  maxExpiresDays?: number
}

export const CreateApiTokenDialog = ({
  children,
  isOpen,
  isLoading,
  toggle,
  onSubmit: defaultOnSubmit,
  allowedScopes = API_TOKEN_SCOPES,
  maxExpiresDays = API_TOKEN_ABSOLUTE_MAX_EXPIRES_DAYS,
}: Props) => {
  const t = useT()

  const defaultScopes = API_TOKEN_DEFAULT_SCOPES.filter((scope) => allowedScopes.includes(scope))
  const initialScopes = defaultScopes.length ? defaultScopes : [...allowedScopes]
  const defaultExpiresInDays = Math.min(API_TOKEN_DEFAULT_EXPIRES_DAYS, maxExpiresDays)

  const [scopes, setScopes] = useState<ApiTokenScope[]>(initialScopes)
  const [created, setCreated] = useState<ApiTokenCreatedModel | undefined>(undefined)
  const [isCopied, setIsCopied] = useState(false)

  const form = useForm<FormValues>({
    defaultValues: {
      name: '',
      expiresInDays: defaultExpiresInDays,
    },
    mode: 'onChange',
  })

  const { register, formState, handleSubmit } = form
  const { errors } = formState

  const { ref: refName, ...nameField } = useRegister({
    ...register('name', {
      required: {
        value: true,
        message: t('common.requiredField'),
      },
    }),
    errors,
    required: true,
  })

  const { ref: refExpires, ...expiresField } = useRegister({
    ...register('expiresInDays', {
      valueAsNumber: true,
      min: { value: 1, message: t('apiTokens.errors.expiresRange', { max: maxExpiresDays }) },
      max: { value: maxExpiresDays, message: t('apiTokens.errors.expiresRange', { max: maxExpiresDays }) },
    }),
    errors,
  })

  const toggleScope = (scope: ApiTokenScope) => {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]))
  }

  const onSubmit = async (values: FormValues) => {
    if (!scopes.length) {
      return
    }

    const result = await defaultOnSubmit?.({
      name: values.name,
      scopes,
      expiresInDays: values.expiresInDays,
    })

    if (result) {
      setCreated(result)
      form.reset()
    }

    return result
  }

  const onCopy = async () => {
    if (!created) {
      return
    }

    await navigator.clipboard.writeText(created.token)
    setIsCopied(true)
  }

  const onOpenChange = (open: boolean) => {
    if (!open) {
      form.reset()
      setCreated(undefined)
      setIsCopied(false)
      setScopes(initialScopes)
    }

    toggle?.()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]" isOverlayClosable={false}>
        <DialogHeader>
          <DialogTitle>{created ? t('apiTokens.createdTitle') : t('apiTokens.create')}</DialogTitle>
          <DialogDescription>{created ? t('apiTokens.createdHint') : t('apiTokens.title')}</DialogDescription>
        </DialogHeader>
        {created ? (
          <div className="w-full flex flex-col gap-4 py-4">
            <Typography variant="Body/M/Semibold" className="font-mono break-all select-all">
              {created.token}
            </Typography>
            <DialogFooter>
              <Button variant="outline" onClick={onCopy}>
                {isCopied ? t('apiTokens.copied') : t('apiTokens.copy')}
              </Button>
              <Button onClick={() => onOpenChange(false)}>{t('apiTokens.close')}</Button>
            </DialogFooter>
          </div>
        ) : (
          <FormProvider {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="w-full">
              <div className="flex flex-col gap-4 py-4">
                <DefaultFieldContainer
                  disabled={isLoading}
                  ref={refName}
                  {...nameField}
                  label={t('apiTokens.name') as AppMessageKey}
                  placeholder={t('apiTokens.namePlaceholder')}
                />
                <div className="flex flex-col gap-2">
                  <Typography variant="Body/S/Semibold">{t('apiTokens.scopes')}</Typography>
                  {allowedScopes.map((scope) => (
                    <Label key={scope} className="flex flex-row items-center gap-2 cursor-pointer">
                      <Checkbox checked={scopes.includes(scope)} onCheckedChange={() => toggleScope(scope)} disabled={isLoading} />
                      {/* eslint-disable-next-line no-restricted-syntax -- presentational wrapper for the two-line checkbox label */}
                      <span className="flex flex-col">
                        <Typography variant="Body/S/Regular">{scope}</Typography>
                        <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                          {t(`apiTokens.scopeDescriptions.${scope}` as AppMessageKey)}
                        </Typography>
                      </span>
                    </Label>
                  ))}
                  {!scopes.length && (
                    <Typography variant="Body/XS/Regular" className="text-destructive">
                      {t('apiTokens.errors.scopesRequired')}
                    </Typography>
                  )}
                </div>
                <DefaultFieldContainer
                  disabled={isLoading}
                  ref={refExpires}
                  {...expiresField}
                  type="number"
                  label={t('apiTokens.expiresInDays') as AppMessageKey}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading || !scopes.length} isLoading={isLoading}>
                  {t('apiTokens.create')}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  )
}
