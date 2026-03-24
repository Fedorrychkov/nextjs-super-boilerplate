'use client'

import { useCallback, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { ArticleModel, ArticleVisibility } from '~/api/article'
import { ArticleRevisionMediaMetadata, ArticleRevisionModel, ArticleRevisionSeoMetadata } from '~/api/article-revision'
import { MediaProvider, MediaResourceType } from '~/api/media'
import { DefaultCheckbox, DefaultFieldContainer, DefaultMultiselectField, DefaultTextAreaContainer, MediaUrlUploadField } from '~/components/Fields'
import { Button, Option, Typography } from '~/components/ui'
import { handleRegister } from '~/hooks/useRegister'
import { validateCanonicalUrlForStorage } from '~/lib/seo/articleCanonical'

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
  nofollow: true,
  keywords: seo.keywords ?? '',
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
})

export type ArticleEditableSeoSavePayload = {
  metadata: ArticleRevisionMetadataPatch
}

/** Патч для merge с существующим `revision.metadata` на бэке */
export type ArticleRevisionMetadataPatch = {
  seo: ArticleRevisionSeoMetadata
  media?: ArticleRevisionMediaMetadata
}

type Props = {
  articleRevision?: ArticleRevisionModel | null
  article?: ArticleModel | null
  isLoading?: boolean
  isDisabled?: boolean
  onSave?: (payload: ArticleEditableSeoSavePayload) => void
}

export const ArticleEditableSeo = (props: Props) => {
  const { articleRevision, isLoading, onSave, article, isDisabled } = props

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

    return `${site.replace(/\/+$/, '')}/${article?.visibility === ArticleVisibility.PUBLIC ? 'article' : 'private-article'}/${encodeURIComponent(slug)}`
  }, [article])

  const handleSubmit = useCallback(
    (data: SeoForm) => {
      onSave?.({
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
      })
    },
    [onSave, canonicalUrl],
  )

  return (
    <div className="flex flex-col gap-4">
      <Typography variant="Body/M/Regular" className="text-muted-foreground">
        Fields below affect the snippets in search, Open Graph and Twitter/X. Empty OG values are usually filled from the main content / preview.
      </Typography>

      <FormProvider {...form}>
        <form onSubmit={onSubmit(handleSubmit)} className="w-full flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <Typography variant="Body/L/Semibold">Search (Google and others)</Typography>

            <DefaultFieldContainer
              {...handleRegister({
                ...register('metaTitle', {
                  maxLength: { value: 70, message: 'It is better to do up to ~60 characters for the snippet' },
                }),
                errors,
              })}
              disabled={isLoading || isDisabled}
              label="Meta title"
              name="metaTitle"
              hintText="Title in the search (~50–60 characters). If empty, the article title is used."
            />

            <DefaultTextAreaContainer
              {...handleRegister({
                ...register('metaDescription', {
                  maxLength: { value: 320, message: 'Usually enough ~160 characters' },
                }),
                errors,
              })}
              disabled={isLoading || isDisabled}
              label="Meta description"
              name="metaDescription"
              hintText="Short description in the search (~150–160 characters)."
            />

            <DefaultFieldContainer
              {...handleRegister({
                ...register('canonicalUrl', {
                  validate: (v) => {
                    const site = process.env.NEXT_PUBLIC_SITE_URL ?? ''

                    if (!v?.trim()) {
                      return true
                    }

                    const result = validateCanonicalUrlForStorage(v.trim(), site)

                    return result.ok ? true : result.message
                  },
                }),
                errors,
              })}
              disabled={isLoading || isDisabled}
              label="Canonical URL"
              name="canonicalUrl"
              placeholder={canonicalUrl}
              hintText="If the page is available by multiple URLs, specify the main one (https://…)."
            />

            <DefaultTextAreaContainer
              {...handleRegister({
                ...register('keywords', { maxLength: { value: 500, message: 'Not more than 500 characters' } }),
                errors,
              })}
              disabled={isLoading || isDisabled}
              label="Meta keywords (optional)"
              name="keywords"
              hintText="Through a comma. For Google almost does not affect, sometimes other systems are used."
            />
          </section>

          <section className="flex flex-col gap-4">
            <Typography variant="Body/L/Semibold">Social networks (Open Graph)</Typography>

            <DefaultFieldContainer
              {...handleRegister({
                ...register('ogTitle', { maxLength: { value: 100, message: 'Up to ~100 characters' } }),
                errors,
              })}
              disabled={isLoading || isDisabled}
              label="OG title"
              name="ogTitle"
              hintText="If empty, the meta title or article title is used."
            />

            <DefaultTextAreaContainer
              {...handleRegister({
                ...register('ogDescription', { maxLength: { value: 320, message: 'Up to ~200 characters for the preview' } }),
                errors,
              })}
              disabled={isLoading || isDisabled}
              label="OG description"
              name="ogDescription"
              hintText="If empty, the meta description or short description of the article is used."
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
              label="OG image URL"
              value={(watch('ogImageUrl') as string) ?? ''}
              assetId={(watch('ogImageAssetId') as string) ?? null}
              articleRevisionId={articleRevision?.id ?? null}
              disabled={isLoading || isDisabled}
              resourceType={MediaResourceType.IMAGE}
              variant="seo"
              onChange={(next) => {
                setValue('ogImageUrl', next.value ?? '', { shouldDirty: true })
                setValue('ogImageAssetId', next.assetId ?? '', { shouldDirty: true })
              }}
              hintText="Recommended ~1200x630. Upload/paste/drop image and keep proxy URL."
            />
          </section>

          <section className="flex flex-col gap-4">
            <Typography variant="Body/L/Semibold">Twitter / X</Typography>

            <DefaultMultiselectField
              options={twitterCardOptions}
              {...handleRegister({
                ...register('twitterCard', { required: { value: true, message: 'Select the type of card' } }),
                errors,
                required: true,
              })}
              updateBySelected
              disabled={isLoading || isDisabled}
              label="Twitter card type"
              name="twitterCard"
            />
          </section>

          <section className="flex flex-col gap-4">
            <Typography variant="Body/L/Semibold">Indexing (robots)</Typography>

            <DefaultCheckbox
              {...handleRegister({
                ...register('noindex'),
                errors,
              })}
              name="noindex"
              label="Hide from search (noindex)"
              description="The page should not be indexed by search engines."
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
              label="Do not pass weight by links (nofollow)"
              description="Search engines should not follow the links from the page (rarely needed for articles)."
              disabled
            />
          </section>

          <div>
            <Button type="submit" variant="secondary" size="default" disabled={isLoading || isDisabled}>
              Save SEO
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}
