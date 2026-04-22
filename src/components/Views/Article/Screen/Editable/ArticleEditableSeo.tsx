'use client'

import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { ArticleModel, ArticleVisibility } from '~/api/article'
import { ArticleRevisionMediaMetadata, ArticleRevisionModel, ArticleRevisionSeoMetadata } from '~/api/article-revision'
import { MediaProvider, MediaResourceType } from '~/api/media'
import { DefaultCheckbox, DefaultFieldContainer, DefaultMultiselectField, DefaultTextAreaContainer, MediaUrlUploadField } from '~/components/Fields'
import { Button, Option, Typography } from '~/components/ui'
import { routes } from '~/constants'
import { handleRegister } from '~/hooks/useRegister'
import { COMMON_CONTENT_LANGUAGE_TAGS } from '~/lib/i18n/config'
import { validateCanonicalUrlForStorage } from '~/lib/seo/articleCanonical'
import { normalizeBcp47ArticleLocale } from '~/lib/seo/articleLanguage'
import { useT } from '~/providers'

type SeoForm = {
  metaTitle: string
  metaDescription: string
  canonicalUrl: string
  ogTitle: string
  ogDescription: string
  ogImageUrl: string
  ogImageAssetId: string
  twitterCard: Option[] | null
  noindex: boolean
  nofollow: boolean
  keywords: string
  /** BCP-47 content / hreflang language (synced to `Article.locale` on save from parent). */
  contentLanguage: string
}

const twitterCardOptions: Option[] = [
  { value: 'summary_large_image', label: 'Summary — large image' },
  { value: 'summary', label: 'Summary' },
]

const emptySeo = (): ArticleRevisionSeoMetadata => ({
  metaTitle: null,
  metaDescription: null,
  canonicalUrl: null,
  ogTitle: null,
  ogDescription: null,
  ogImageUrl: null,
  twitterCard: 'summary_large_image',
  noindex: false,
  nofollow: false,
  keywords: null,
  language: null,
})

const readSeoFromRevision = (revision: ArticleRevisionModel | null | undefined): ArticleRevisionSeoMetadata => {
  const raw = revision?.metadata as { seo?: ArticleRevisionSeoMetadata | null } | undefined

  return { ...emptySeo(), ...raw?.seo }
}

const toFormValues = (seo: ArticleRevisionSeoMetadata, article?: ArticleModel | null): SeoForm => ({
  metaTitle: seo.metaTitle ?? '',
  metaDescription: seo.metaDescription ?? '',
  canonicalUrl: seo.canonicalUrl ?? '',
  ogTitle: seo.ogTitle ?? '',
  ogDescription: seo.ogDescription ?? '',
  ogImageUrl: seo.ogImageUrl ?? '',
  ogImageAssetId: seo.ogImageAssetId ?? '',
  twitterCard: seo.twitterCard
    ? [{ value: seo.twitterCard, label: twitterCardOptions.find((o) => o.value === seo.twitterCard)?.label ?? String(seo.twitterCard) }]
    : [{ value: 'summary_large_image', label: twitterCardOptions[0].label }],
  noindex: article?.visibility ? [ArticleVisibility.PRIVATE, ArticleVisibility.LINK_ONLY].includes(article.visibility) : Boolean(seo.noindex),
  nofollow: seo.nofollow ?? false,
  keywords: seo.keywords ?? '',
  contentLanguage: (() => {
    const fromSeo = seo.language?.trim()

    if (fromSeo) {
      return fromSeo
    }

    return article?.locale?.trim() ?? ''
  })(),
})

const formToSeoPayload = (data: SeoForm): ArticleRevisionSeoMetadata => ({
  metaTitle: data.metaTitle.trim() || null,
  metaDescription: data.metaDescription.trim() || null,
  canonicalUrl: data.canonicalUrl.trim() || null,
  ogTitle: data.ogTitle.trim() || null,
  ogDescription: data.ogDescription.trim() || null,
  ogImageUrl: data.ogImageUrl.trim() || null,
  ogImageAssetId: data.ogImageAssetId.trim() || null,
  twitterCard: (data.twitterCard?.[0]?.value as ArticleRevisionSeoMetadata['twitterCard']) ?? 'summary_large_image',
  noindex: data.noindex,
  nofollow: data.nofollow,
  keywords: data.keywords.trim() || null,
  language: normalizeBcp47ArticleLocale(data.contentLanguage) ?? (data.contentLanguage.trim() ? data.contentLanguage.trim().toLowerCase() : null),
})

export type ArticleEditableSeoHandle = {
  applyPartial: (partial: Partial<Pick<ArticleRevisionSeoMetadata, 'metaTitle' | 'metaDescription' | 'ogTitle' | 'ogDescription' | 'keywords'>>) => void
}

export type ArticleEditableSeoSavePayload = {
  metadata: ArticleRevisionMetadataPatch
}

/** Patch to merge with existing `revision.metadata` on the backend */
export type ArticleRevisionMetadataPatch = {
  seo: ArticleRevisionSeoMetadata
  media?: ArticleRevisionMediaMetadata
}

type Props = {
  articleRevision?: ArticleRevisionModel | null
  article?: ArticleModel | null
  isLoading?: boolean
  isDisabled?: boolean
  onSave?: (payload: ArticleEditableSeoSavePayload) => void | Promise<void>
  /** Called only after a successful `onSave` when the user chose “save and go to …”. */
  onAfterSeoSaveNavigate?: (target: 'translations' | 'publication') => void
}

export const ArticleEditableSeo = forwardRef<ArticleEditableSeoHandle, Props>(function ArticleEditableSeo(props, ref) {
  const { articleRevision, isLoading, onSave, onAfterSeoSaveNavigate, article, isDisabled } = props
  const t = useT()
  const formRef = useRef<HTMLFormElement>(null)

  const defaultValues = useMemo(() => toFormValues(readSeoFromRevision(articleRevision), article), [articleRevision, article])

  const form = useForm<SeoForm>({
    defaultValues,
    mode: 'onChange',
  })

  const { register, formState, handleSubmit: onSubmit } = form
  const { setValue, watch } = form
  const { errors } = formState

  const canonicalUrl = useMemo(() => {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? ''
    const slug = article?.slug

    if (!site || !slug) {
      return ''
    }

    return `${site.replace(/\/+$/, '')}${article?.visibility === ArticleVisibility.PUBLIC ? `${routes.articlePublic.path?.replace(':slug', slug ?? '')}` : `${routes.articlePrivate.path?.replace(':slug', slug ?? '')}`}`
  }, [article])

  const buildSavePayload = useCallback(
    (data: SeoForm): ArticleEditableSeoSavePayload => ({
      metadata: {
        seo: {
          ...formToSeoPayload(data),
          canonicalUrl: data.canonicalUrl.trim() || canonicalUrl || null,
        },
        media: {
          seoOgImage: data.ogImageAssetId
            ? {
                assetId: data.ogImageAssetId,
                provider: MediaProvider.UPLOADCARE,
                resourceType: MediaResourceType.IMAGE,
                url: data.ogImageUrl.trim() || null,
              }
            : null,
        },
      },
    }),
    [canonicalUrl],
  )

  const runSave = useCallback(
    async (data: SeoForm, navigate: 'translations' | 'publication' | null) => {
      if (!onSave) {
        return
      }

      try {
        const payload = buildSavePayload(data)

        await onSave(payload)

        if (navigate) {
          onAfterSeoSaveNavigate?.(navigate)
        }
      } catch {
        // Parent shows errors; do not navigate after failed save
      }
    },
    [buildSavePayload, onSave, onAfterSeoSaveNavigate],
  )

  useImperativeHandle(
    ref,
    () => ({
      applyPartial(partial) {
        if (partial.metaTitle !== undefined) {
          setValue('metaTitle', partial.metaTitle ?? '', { shouldDirty: true })
        }

        if (partial.metaDescription !== undefined) {
          setValue('metaDescription', partial.metaDescription ?? '', { shouldDirty: true })
        }

        if (partial.ogTitle !== undefined) {
          setValue('ogTitle', partial.ogTitle ?? '', { shouldDirty: true })
        }

        if (partial.ogDescription !== undefined) {
          setValue('ogDescription', partial.ogDescription ?? '', { shouldDirty: true })
        }

        if (partial.keywords !== undefined) {
          setValue('keywords', partial.keywords ?? '', { shouldDirty: true })
        }

        void onSubmit(async (data) => {
          await runSave(data, null)
        })()
      },
    }),
    [setValue, onSubmit, runSave],
  )

  return (
    <div className="flex flex-col gap-4">
      <Typography variant="Body/M/Regular" className="text-muted-foreground">
        {t('article.ui.fieldsBelowAffectTheSnippetsInSearchOpenGraphAndTwitterX')}
      </Typography>

      <FormProvider {...form}>
        <form onSubmit={onSubmit(async (data) => runSave(data, null))} className="w-full flex flex-col gap-6" ref={formRef}>
          <section className="flex flex-col gap-4">
            <Typography variant="Body/L/Semibold">{t('article.ui.searchGoogleAndOthers')}</Typography>

            <DefaultFieldContainer
              {...handleRegister({
                ...register('metaTitle', {
                  maxLength: { value: 70, message: t('article.errors.itIsBetterToDoUpTo60CharactersForTheSnippet') },
                }),
                errors,
              })}
              disabled={isLoading || isDisabled}
              label={t('article.ui.metaTitle')}
              name="metaTitle"
              hintText={t('article.ui.titleInTheSearch5060CharactersIfEmptyTheArticleTitleIsUsed')}
            />

            <DefaultTextAreaContainer
              {...handleRegister({
                ...register('metaDescription', {
                  maxLength: { value: 320, message: t('article.errors.usuallyEnough160Characters') },
                }),
                errors,
              })}
              disabled={isLoading || isDisabled}
              label={t('article.ui.metaDescription')}
              name="metaDescription"
              hintText={t('article.ui.shortDescriptionInTheSearch150160Characters')}
            />

            <DefaultFieldContainer
              {...handleRegister({
                ...register('canonicalUrl', {
                  validate: (v) => {
                    const site = process.env.NEXT_PUBLIC_SITE_URL ?? ''

                    if (!v?.trim()) {
                      return true
                    }

                    const result = validateCanonicalUrlForStorage(v.trim(), site, t)

                    return result.ok ? true : result.message
                  },
                }),
                errors,
              })}
              disabled={isLoading || isDisabled}
              label={t('article.ui.canonicalUrl')}
              name="canonicalUrl"
              placeholder={canonicalUrl}
              hintText={t('article.ui.ifThePageIsAvailableByMultipleURLsSpecifyTheMainOneHttps')}
            />

            <DefaultTextAreaContainer
              {...handleRegister({
                ...register('keywords', { maxLength: { value: 500, message: t('article.errors.notMoreThan500Characters') } }),
                errors,
              })}
              disabled={isLoading || isDisabled}
              label={t('article.ui.metaKeywordsOptional')}
              name="keywords"
              hintText={t('article.ui.throughACommaForGoogleAlmostDoesNotAffectSometimesOtherSystemsAreUsed')}
            />

            <DefaultFieldContainer
              {...handleRegister({
                ...register('contentLanguage', {
                  maxLength: { value: 35, message: t('article.errors.contentLanguageTooLong') },
                }),
                errors,
              })}
              disabled={isLoading || isDisabled}
              label={t('article.ui.articleLanguageOptional')}
              name="contentLanguage"
              placeholder="ru, de, pt-BR…"
              list="seo-article-content-language-list"
              hintText={t('article.ui.contentLanguageSeoHint')}
            />
            <datalist id="seo-article-content-language-list">
              {COMMON_CONTENT_LANGUAGE_TAGS.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
            <Typography variant="Body/XS/Regular" className="text-muted-foreground -mt-2">
              {t('article.ui.ifNotSpecifiedTheDefaultSiteLanguageWillBeUsed')}
            </Typography>
          </section>

          <section className="flex flex-col gap-4">
            <Typography variant="Body/L/Semibold">{t('article.ui.socialNetworksOpenGraph')}</Typography>

            <DefaultFieldContainer
              {...handleRegister({
                ...register('ogTitle', { maxLength: { value: 100, message: t('article.errors.upTo100Characters') } }),
                errors,
              })}
              disabled={isLoading || isDisabled}
              label={t('article.ui.ogTitle')}
              name="ogTitle"
              hintText={t('article.ui.ifEmptyTheMetaTitleOrArticleTitleIsUsed')}
            />

            <DefaultTextAreaContainer
              {...handleRegister({
                ...register('ogDescription', { maxLength: { value: 320, message: t('article.errors.upTo200CharactersForThePreview') } }),
                errors,
              })}
              disabled={isLoading || isDisabled}
              label={t('article.ui.ogDescription')}
              name="ogDescription"
              hintText={t('article.ui.ifEmptyTheMetaDescriptionOrShortDescriptionOfTheArticleIsUsed')}
            />

            <DefaultFieldContainer
              {...handleRegister({
                ...register('ogImageAssetId'),
                errors,
              })}
              classNames={{ root: 'hidden' }}
              disabled
              label=""
              name="ogImageAssetId"
            />
            <MediaUrlUploadField
              label={t('article.ui.ogImageUrl')}
              value={(watch('ogImageUrl') as string) ?? ''}
              assetId={(watch('ogImageAssetId') as string) ?? null}
              articleId={article?.id ?? null}
              articleRevisionId={articleRevision?.id ?? null}
              disabled={isLoading || isDisabled}
              resourceType={MediaResourceType.IMAGE}
              variant="seo"
              onChange={(next) => {
                setValue('ogImageUrl', next.value ?? '', { shouldDirty: true })
                setValue('ogImageAssetId', next.assetId ?? '', { shouldDirty: true })
              }}
              hintText={t('article.ui.recommended1200x630UploadPasteDropImageAndKeepProxyURL')}
            />
          </section>

          <section className="flex flex-col gap-4">
            <Typography variant="Body/L/Semibold">{t('article.ui.twitterX')}</Typography>

            <DefaultMultiselectField
              options={twitterCardOptions}
              {...handleRegister({
                ...register('twitterCard', { required: { value: true, message: t('article.errors.selectTheTypeOfCard') } }),
                errors,
                required: true,
              })}
              updateBySelected
              disabled={isLoading || isDisabled}
              label={t('article.ui.twitterCardType')}
              name="twitterCard"
            />
          </section>

          <section className="flex flex-col gap-4">
            <Typography variant="Body/L/Semibold">{t('article.ui.indexingRobots')}</Typography>

            <DefaultCheckbox
              {...handleRegister({
                ...register('noindex'),
                errors,
              })}
              name="noindex"
              label={t('article.ui.hideFromSearchNoindex')}
              description={t('article.ui.thePageShouldNotBeIndexedBySearchEngines')}
              disabled={
                isDisabled || isLoading || [ArticleVisibility.PRIVATE, ArticleVisibility.LINK_ONLY].includes(article?.visibility ?? ArticleVisibility.PUBLIC)
              }
            />

            <DefaultCheckbox
              {...handleRegister({
                ...register('nofollow'),
                errors,
              })}
              name="nofollow"
              label={t('article.ui.doNotPassWeightByLinksNofollow')}
              description={t('article.ui.searchEnginesShouldNotFollowTheLinksFromThePageRarelyNeededForArticles')}
              disabled
            />
          </section>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="secondary" size="default" disabled={isLoading || isDisabled}>
              {t('common.save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="default"
              disabled={isLoading || isDisabled}
              onClick={() => void onSubmit(async (data) => runSave(data, 'translations'))()}
            >
              {t('article.ui.seoSaveAndNext')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="default"
              disabled={isLoading || isDisabled}
              onClick={() => void onSubmit(async (data) => runSave(data, 'publication'))()}
            >
              {t('article.ui.seoSaveAndPublication')}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
})
