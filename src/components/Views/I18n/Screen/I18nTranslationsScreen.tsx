'use client'

import { AxiosError } from 'axios'
import { ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { type Control, Controller, FormProvider, useForm } from 'react-hook-form'

import { type I18nTranslationEntryModel, type I18nTranslationListResponse } from '~/api/i18n'
import { TabsContainer } from '~/components/Blocks/Tabs/TabsContainer'
import { TitleWithBadge } from '~/components/Blocks/TitleWithBadge'
import { DefaultFieldContainer } from '~/components/Fields'
import { InputField } from '~/components/Fields/Input/InputField'
import { TextAreaField } from '~/components/Fields/Input/TextAreaField'
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Typography,
} from '~/components/ui'
import { handleRegister } from '~/hooks/useRegister'
import { COMMON_CONTENT_LANGUAGE_TAGS, SUPPORTED_LOCALES } from '~/lib/i18n/config'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import {
  useI18nCreateLocaleMutation,
  useI18nLocalesQuery,
  useI18nSyncLocalesFromFilesMutation,
  useI18nTranslationsQuery,
  useI18nUpsertTranslationMutation,
  useI18nUpsertTranslationsBatchMutation,
} from '~/query/i18n'
import { cn } from '~/utils/cn'

type TranslationForm = {
  items: Array<{ value: string }>
}

type AddLocaleForm = {
  code: string
  label: string
}

type TranslationRowProps = {
  control: Control<TranslationForm>
  idx: number
  entry: I18nTranslationEntryModel
  baselineEffective: string
  onSaveOne: (idx: number) => void
  onResetOverride: (idx: number) => void
  upsertLoading: boolean
  saveLabel: string
  resetLabel: string
  keyLabelPrefix: string
  baseEnLabel: string
  fileLocaleLabel: string
  effectiveLabel: string
}

const I18nTranslationEntryCard = memo(function I18nTranslationEntryCard({
  control,
  idx,
  entry,
  baselineEffective,
  onSaveOne,
  onResetOverride,
  upsertLoading,
  saveLabel,
  resetLabel,
  keyLabelPrefix,
  baseEnLabel,
  fileLocaleLabel,
  effectiveLabel,
}: TranslationRowProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-3" style={{ contentVisibility: 'auto', containIntrinsicSize: '280px' }}>
      <Controller
        control={control}
        name={`items.${idx}.value`}
        render={({ field, fieldState }) => {
          const dirty = field.value !== baselineEffective

          return (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Typography variant="Body/S/Semibold" className="break-all">
                  {keyLabelPrefix}: {entry.key}
                </Typography>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm-md"
                    className={cn({ hidden: !dirty })}
                    onClick={() => onSaveOne(idx)}
                    disabled={upsertLoading}
                  >
                    {saveLabel}
                  </Button>
                  <Button type="button" variant="secondary" size="sm-md" onClick={() => onResetOverride(idx)} disabled={upsertLoading}>
                    {resetLabel}
                  </Button>
                </div>
              </div>

              <TextAreaField
                name={field.name}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                error={fieldState.error?.message}
                classNames={{ root: 'w-full min-w-0' }}
              />
            </>
          )
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 rounded-md bg-muted/40 p-2">
        <div>
          <Typography variant="Body/XS/Semibold">{baseEnLabel}</Typography>
          <Typography variant="Body/XS/Regular" className="text-muted-foreground whitespace-pre-wrap">
            {entry.baseEnValue || '—'}
          </Typography>
        </div>
        <div>
          <Typography variant="Body/XS/Semibold">{fileLocaleLabel}</Typography>
          <Typography variant="Body/XS/Regular" className="text-muted-foreground whitespace-pre-wrap">
            {entry.fileLocaleValue || '—'}
          </Typography>
        </div>
        <div>
          <Typography variant="Body/XS/Semibold">{effectiveLabel}</Typography>
          <Typography variant="Body/XS/Regular" className="text-muted-foreground whitespace-pre-wrap">
            {entry.effectiveValue || '—'}
          </Typography>
        </div>
      </div>
    </div>
  )
})

type EditorProps = {
  activeLocale: string
  translationsData: I18nTranslationListResponse
  isTranslationsLoading: boolean
  refetchTranslations: () => Promise<unknown>
  upsertMutation: ReturnType<typeof useI18nUpsertTranslationMutation>
  batchMutation: ReturnType<typeof useI18nUpsertTranslationsBatchMutation>
  notify: ReturnType<typeof useNotify>['notify']
  t: ReturnType<typeof useT>
}

function I18nTranslationsEditor({
  activeLocale,
  translationsData,
  isTranslationsLoading,
  refetchTranslations,
  upsertMutation,
  batchMutation,
  notify,
  t,
}: EditorProps) {
  const form = useForm<TranslationForm>({
    defaultValues: { items: [] },
  })
  const { control, reset, getValues } = form

  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase())

  useEffect(() => {
    reset({
      items: translationsData.list.map((item) => ({ value: item.effectiveValue ?? '' })),
    })
  }, [translationsData, reset])

  const visibleRows = useMemo(() => {
    const list = translationsData.list

    if (!deferredSearch) {
      return list.map((entry, idx) => ({ entry, idx }))
    }

    const itemsSnapshot = getValues('items')

    return list
      .map((entry, idx) => ({
        entry,
        idx,
        draft: itemsSnapshot[idx]?.value ?? '',
      }))
      .filter(({ entry, draft }) => {
        const hay = [entry.key, entry.baseEnValue ?? '', entry.fileLocaleValue ?? '', entry.effectiveValue ?? '', draft].join('\n').toLowerCase()

        return hay.includes(deferredSearch)
      })
      .map(({ entry, idx }) => ({ entry, idx }))
  }, [translationsData, deferredSearch, getValues])

  const saveOne = useCallback(
    async (idx: number) => {
      const key = translationsData.list[idx]?.key
      const value = getValues(`items.${idx}.value`)

      if (!activeLocale || !key) {
        return
      }

      try {
        await upsertMutation.mutateAsync({
          localeCode: activeLocale,
          key,
          value,
        })

        notify(t('i18n.ui.updated'), 'success')
        await refetchTranslations()
      } catch (error) {
        if (error instanceof AxiosError) {
          notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')
        } else {
          notify(t('errors.unknown'), 'destructive')
        }
      }
    },
    [activeLocale, getValues, notify, refetchTranslations, t, translationsData.list, upsertMutation],
  )

  const saveAll = useCallback(async () => {
    if (!activeLocale) {
      return
    }

    const list = translationsData.list
    const itemsValues = getValues('items')
    const dirtyItems = list
      .map((entry, idx) => ({ entry, idx, value: itemsValues[idx]?.value ?? '' }))
      .filter(({ entry, value }) => value !== (entry.effectiveValue ?? ''))
      .map(({ entry, value }) => ({
        localeCode: activeLocale,
        key: entry.key,
        value,
      }))

    if (dirtyItems.length < 1) {
      return
    }

    try {
      await batchMutation.mutateAsync({ items: dirtyItems })
      notify(t('i18n.ui.batchUpdated'), 'success')
      await refetchTranslations()
    } catch (error) {
      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')
      } else {
        notify(t('errors.unknown'), 'destructive')
      }
    }
  }, [activeLocale, batchMutation, getValues, notify, refetchTranslations, t, translationsData.list])

  const resetOverride = useCallback(
    async (idx: number) => {
      const key = translationsData.list[idx]?.key

      if (!activeLocale || !key) {
        return
      }

      try {
        await upsertMutation.mutateAsync({
          localeCode: activeLocale,
          key,
          value: null,
        })

        notify(t('i18n.ui.updated'), 'success')
        await refetchTranslations()
      } catch (error) {
        if (error instanceof AxiosError) {
          notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')
        } else {
          notify(t('errors.unknown'), 'destructive')
        }
      }
    },
    [activeLocale, notify, refetchTranslations, t, translationsData.list, upsertMutation],
  )

  return (
    <FormProvider {...form}>
      <div className="flex flex-col gap-3">
        <InputField
          name="i18n-translations-search"
          type="text"
          placeholder={t('i18n.ui.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          classNames={{ root: 'w-full min-w-0' }}
        />

        <div className="flex items-center justify-end">
          <Button type="button" variant="default" size="sm-md" disabled={batchMutation.isLoading || !activeLocale} onClick={() => void saveAll()}>
            {t('i18n.ui.saveAll')}
          </Button>
        </div>

        {isTranslationsLoading ? (
          <Typography variant="Body/S/Regular">{t('common.loading')}</Typography>
        ) : visibleRows.length < 1 ? (
          <Typography variant="Body/S/Regular" className="text-muted-foreground">
            {t('i18n.ui.noItems')}
          </Typography>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {visibleRows.map(({ entry, idx }) => (
              <I18nTranslationEntryCard
                key={entry.key}
                control={control}
                idx={idx}
                entry={entry}
                baselineEffective={entry.effectiveValue ?? ''}
                onSaveOne={saveOne}
                onResetOverride={resetOverride}
                upsertLoading={upsertMutation.isLoading}
                saveLabel={t('i18n.ui.saveCard')}
                resetLabel={t('i18n.ui.resetCard')}
                keyLabelPrefix={t('i18n.ui.keyLabel')}
                baseEnLabel={t('i18n.ui.baseEn')}
                fileLocaleLabel={t('i18n.ui.fileLocale')}
                effectiveLabel={t('i18n.ui.effective')}
              />
            ))}
          </div>
        )}
      </div>
    </FormProvider>
  )
}

export function I18nTranslationsScreen() {
  const t = useT()
  const { notify } = useNotify()
  const [addLocaleOpen, setAddLocaleOpen] = useState(false)
  const [localeTab, setLocaleTab] = useState('')

  const addLocaleForm = useForm<AddLocaleForm>({
    defaultValues: {
      code: '',
      label: '',
    },
  })

  const { data: localesData, isLoading: isLocalesLoading } = useI18nLocalesQuery()
  const locales = useMemo(() => localesData?.list ?? [], [localesData])
  const activeLocale = localeTab.length > 0 ? localeTab : (locales[0]?.code ?? '')

  const {
    data: translationsData,
    isLoading: isTranslationsLoading,
    refetch: refetchTranslations,
  } = useI18nTranslationsQuery(activeLocale, Boolean(activeLocale))
  const upsertMutation = useI18nUpsertTranslationMutation()
  const batchMutation = useI18nUpsertTranslationsBatchMutation()
  const createLocaleMutation = useI18nCreateLocaleMutation()
  const syncLocalesFromFilesMutation = useI18nSyncLocalesFromFilesMutation()

  const tabs = useMemo(
    () =>
      locales.map((locale) => ({
        label: locale.label?.trim() || locale.code,
        value: locale.code,
      })),
    [locales],
  )

  const fileBackedLocaleCodes = useMemo(() => [...SUPPORTED_LOCALES] as string[], [])
  const dbLocaleCodes = useMemo(() => new Set(locales.map((l) => l.code)), [locales])
  const missingFileLocalesInDb = useMemo(() => fileBackedLocaleCodes.filter((code) => !dbLocaleCodes.has(code)), [dbLocaleCodes, fileBackedLocaleCodes])
  const dbLocalesWithoutFileBundle = useMemo(() => locales.filter((l) => !fileBackedLocaleCodes.includes(l.code)), [fileBackedLocaleCodes, locales])

  const syncLocalesFromFiles = async () => {
    try {
      await syncLocalesFromFilesMutation.mutateAsync()
      notify(t('i18n.ui.syncLocalesSuccess'), 'success')
    } catch (error) {
      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')
      } else {
        notify(t('errors.unknown'), 'destructive')
      }
    }
  }

  const handleCreateLocale = addLocaleForm.handleSubmit(async (values) => {
    try {
      await createLocaleMutation.mutateAsync({
        code: values.code.trim(),
        label: values.label.trim() || null,
      })
      notify(t('i18n.ui.localeCreated'), 'success')
      addLocaleForm.reset()
      setAddLocaleOpen(false)
    } catch (error) {
      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')
      } else {
        notify(t('errors.unknown'), 'destructive')
      }
    }
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-2">
          <TitleWithBadge title={t('i18n.ui.title')} />
          <Typography variant="Body/S/Regular" className="text-muted-foreground max-w-4xl">
            {t('i18n.ui.description')}
          </Typography>
        </div>
        <Button type="button" variant="outline" size="sm-md" onClick={() => setAddLocaleOpen(true)}>
          {t('i18n.ui.addLanguage')}
        </Button>
      </div>

      {!isLocalesLoading && missingFileLocalesInDb.length > 0 ? (
        <Alert variant="warning" appearance="light" size="md" className="items-start">
          <AlertIcon>
            <ShieldAlert />
          </AlertIcon>
          <AlertContent className="min-w-0 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <AlertTitle>{t('i18n.ui.syncLocalesTitle')}</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                {t('i18n.ui.syncLocalesBody', { codes: missingFileLocalesInDb.join(', ') })}
              </AlertDescription>
            </div>
            <Button
              type="button"
              variant="default"
              size="sm-md"
              className="shrink-0 self-start"
              disabled={syncLocalesFromFilesMutation.isLoading}
              onClick={() => void syncLocalesFromFiles()}
            >
              {t('i18n.ui.syncLocalesButton')}
            </Button>
          </AlertContent>
        </Alert>
      ) : null}

      {!isLocalesLoading && dbLocalesWithoutFileBundle.length > 0 ? (
        <Alert variant="info" appearance="light" size="md" className="items-start">
          <AlertIcon>
            <ShieldAlert />
          </AlertIcon>
          <AlertContent className="min-w-0">
            <AlertTitle>{t('i18n.ui.dbOnlyLocalesTitle')}</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              {t('i18n.ui.dbOnlyLocalesBody', { codes: dbLocalesWithoutFileBundle.map((l) => l.code).join(', ') })}
            </AlertDescription>
          </AlertContent>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3">
        <TabsContainer searchMutable mode="now" tabs={tabs} currentTab={activeLocale} onTabChange={setLocaleTab} />

        {isLocalesLoading || !activeLocale ? (
          <Typography variant="Body/S/Regular">{t('common.loading')}</Typography>
        ) : translationsData ? (
          <I18nTranslationsEditor
            activeLocale={activeLocale}
            translationsData={translationsData}
            isTranslationsLoading={isTranslationsLoading}
            refetchTranslations={refetchTranslations}
            upsertMutation={upsertMutation}
            batchMutation={batchMutation}
            notify={notify}
            t={t}
          />
        ) : isTranslationsLoading ? (
          <Typography variant="Body/S/Regular">{t('common.loading')}</Typography>
        ) : (
          <Typography variant="Body/S/Regular" className="text-muted-foreground">
            {t('i18n.ui.noItems')}
          </Typography>
        )}
      </div>

      <Dialog open={addLocaleOpen} onOpenChange={setAddLocaleOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('i18n.ui.addLanguageTitle')}</DialogTitle>
            <DialogDescription>{t('i18n.ui.addLanguageDescription')}</DialogDescription>
          </DialogHeader>

          <FormProvider {...addLocaleForm}>
            <form onSubmit={handleCreateLocale} className="flex flex-col gap-3">
              <DefaultFieldContainer
                {...handleRegister({
                  ...addLocaleForm.register('code', { required: { value: true, message: t('common.requiredField') } }),
                  errors: addLocaleForm.formState.errors,
                })}
                name="code"
                label={t('i18n.ui.localeCode')}
                list="seo-article-content-language-list"
              />

              <datalist id="seo-article-content-language-list">
                {COMMON_CONTENT_LANGUAGE_TAGS.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
              <DefaultFieldContainer
                {...handleRegister({
                  ...addLocaleForm.register('label'),
                  errors: addLocaleForm.formState.errors,
                })}
                name="label"
                label={t('i18n.ui.localeLabelOptional')}
              />
              <div className="text-sm">
                <Link href="https://en.wikipedia.org/wiki/IETF_language_tag" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  {t('i18n.ui.openBcp47Guide')}
                </Link>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setAddLocaleOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" variant="default" disabled={createLocaleMutation.isLoading}>
                  {t('common.save')}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>
    </div>
  )
}
