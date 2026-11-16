'use client'

import { AxiosError } from 'axios'
import { ShieldAlert } from 'lucide-react'
import { useState } from 'react'

import type { PlatformSettingModel } from '~/api/platform-settings'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Switch, Typography } from '~/components/ui'
import { Textarea } from '~/components/ui/fields/textarea'
import { Input } from '~/components/ui/input'
import { Select } from '~/components/ui/select-1'
import type { AppMessageKey } from '~/lib/i18n'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { usePlatformSettingsQuery, useUpdatePlatformSettingMutation } from '~/query/platform-settings'
import { time } from '~/utils/time'

import { draftOf, isDirty, type SettingDraft, valueOf } from './setting-editor'

const errorCodeOf = (error: unknown): string | null => {
  if (error instanceof AxiosError) return (error.response?.data as { code?: string } | undefined)?.code ?? null

  return null
}

function SettingRow({ setting }: { setting: PlatformSettingModel }) {
  const t = useT()
  const { notify } = useNotify()
  const mutation = useUpdatePlatformSettingMutation()
  const [draft, setDraft] = useState<SettingDraft>(() => draftOf(setting))
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<unknown | undefined>(undefined)

  const label = (part: 'title' | 'description') => t(`platformSettings.items.${setting.key}.${part}` as AppMessageKey)

  const submit = async (value: unknown) => {
    setError(null)

    try {
      const saved = await mutation.mutateAsync({ key: setting.key, value })

      setDraft(draftOf(saved))
      notify(t('platformSettings.saved'), 'success')
    } catch (err) {
      const code = errorCodeOf(err)

      setError(code ? t(`platformSettings.errors.${code}` as AppMessageKey) : t('errors.unknown'))
    }
  }

  // A sensitive setting (rights, money, where data goes) is changed only after an explicit confirmation.
  const request = (value: unknown) => (setting.sensitive ? setPending(value) : void submit(value))

  const spec = setting.spec

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            {setting.sensitive && <ShieldAlert className="size-4 shrink-0 text-amber-600" aria-hidden />}
            <Typography variant="Body/M/Semibold">{label('title')}</Typography>
          </div>
          <Typography variant="Body/S/Regular" className="text-muted-foreground">
            {label('description')}
          </Typography>
        </div>
        <Typography variant="Body/XS/Regular" className="font-mono text-muted-foreground">
          {setting.key}
        </Typography>
      </div>

      {spec.kind === 'boolean' && (
        <div className="flex w-fit items-center gap-2">
          <Switch id={`setting-${setting.key}`} checked={draft === true} onCheckedChange={setDraft} />
          <Typography asTag="label" htmlFor={`setting-${setting.key}`} variant="Body/S/Regular" className="cursor-pointer">
            {draft === true ? t('platformSettings.enabled') : t('platformSettings.disabled')}
          </Typography>
        </div>
      )}

      {spec.kind === 'int' && <Input type="number" value={String(draft)} onChange={setDraft} wrapperClassName="w-40" />}

      {spec.kind === 'choice' && (
        <Select
          value={String(draft)}
          options={spec.options.map((option) => ({ value: option, label: option }))}
          onChange={(event) => setDraft(event.target.value)}
        />
      )}

      {spec.kind === 'text' && (
        <div className="flex flex-col gap-1">
          {setting.secret && (
            <Typography variant="Body/XS/Regular" className="text-muted-foreground">
              {setting.isSet ? t('platformSettings.secretSet') : t('platformSettings.secretNotSet')}
            </Typography>
          )}
          <Input
            type={setting.secret ? 'password' : 'text'}
            value={String(draft)}
            onChange={setDraft}
            placeholder={setting.secret ? t('platformSettings.secretPlaceholder') : undefined}
            wrapperClassName="max-w-xl"
          />
        </div>
      )}

      {spec.kind === 'textList' && (
        <Textarea value={String(draft)} onChange={(event) => setDraft(event.target.value)} rows={4} className="max-w-xl font-mono text-sm" />
      )}

      {error && (
        <Typography variant="Body/S/Regular" className="text-destructive">
          {error}
        </Typography>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm-md" disabled={mutation.isLoading || !isDirty(setting, draft)} onClick={() => request(valueOf(spec, draft))}>
          {t('platformSettings.save')}
        </Button>
        {setting.isSet && (
          <Button size="sm-md" variant="outline" disabled={mutation.isLoading} onClick={() => request(null)}>
            {setting.secret ? t('platformSettings.removeSecret') : t('platformSettings.reset')}
          </Button>
        )}
        <Typography variant="Body/XS/Regular" className="text-muted-foreground">
          {!setting.secret && t('platformSettings.defaultValue', { value: JSON.stringify(setting.defaultValue) })}
          {setting.updatedAt ? ` · ${t('platformSettings.updatedAt', { date: time(setting.updatedAt).format('DD.MM.YYYY HH:mm') })}` : ''}
        </Typography>
      </div>

      <Dialog open={pending !== undefined} onOpenChange={(open) => !open && setPending(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('platformSettings.confirmTitle')}</DialogTitle>
            <DialogDescription>{t('platformSettings.confirmBody', { title: label('title') })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(undefined)}>
              {t('platformSettings.cancel')}
            </Button>
            <Button
              onClick={() => {
                const value = pending

                setPending(undefined)
                void submit(value)
              }}
            >
              {t('platformSettings.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Platform settings: every runtime setting from `config/platform-settings.ts`, grouped, with an editor by its type. */
export const PlatformSettingsScreen = () => {
  const t = useT()
  const { data, isLoading, isError } = usePlatformSettingsQuery()
  const groups = [...new Set((data?.items ?? []).map((item) => item.group))]

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Typography variant="heading-2">{t('platformSettings.title')}</Typography>
        <Typography variant="Body/S/Regular" className="text-muted-foreground">
          {t('platformSettings.subtitle')}
        </Typography>
      </div>

      {isLoading && <Typography variant="Body/S/Regular">{t('platformSettings.loading')}</Typography>}
      {isError && (
        <Typography variant="Body/S/Regular" className="text-destructive">
          {t('errors.unknown')}
        </Typography>
      )}

      {groups.map((group) => (
        <section key={group} className="flex flex-col gap-3">
          <Typography variant="heading-3">{t(`platformSettings.groups.${group}` as AppMessageKey)}</Typography>
          {data?.items
            .filter((item) => item.group === group)
            .map((item) => (
              <SettingRow key={item.key} setting={item} />
            ))}
        </section>
      ))}
    </div>
  )
}
