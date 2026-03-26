'use client'

import capitalize from 'lodash/capitalize'
import { useCallback, useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import slugify from 'slugify'

import { ArticleModel, ArticleVisibility } from '~/api/article'
import { ArticleRevisionMediaMetadata, ArticleRevisionModel } from '~/api/article-revision'
import { MediaResourceType } from '~/api/media'
import { UserRole } from '~/api/user'
import { DefaultFieldContainer, DefaultMultiselectField, DefaultTextAreaContainer, MediaUrlUploadField } from '~/components/Fields'
import { AlertBlock, Button, Option, Typography } from '~/components/ui'
import { routes } from '~/constants'
import { handleRegister } from '~/hooks/useRegister'
import { useT } from '~/providers'

export type SaveForm = Omit<Form, 'allowedRoles' | 'visibility'> & { allowedRoles?: UserRole[] | null; visibility?: ArticleVisibility | null }

type Form = {
  title?: string | null
  description?: string | null
  thumbnailUrl?: string | null
  thumbnailAssetId?: string | null
  slug?: string | null
  visibility?: Option[] | null
  /**
   * If Private, we can choose which roles can access the article
   */
  allowedRoles?: Option[] | null
}

const visibilityOptions = [
  { value: ArticleVisibility.PUBLIC, label: 'Public' },
  { value: ArticleVisibility.PRIVATE, label: 'Private' },
  { value: ArticleVisibility.LINK_ONLY, label: 'Link Only' },
]

const allowedRolesOptions = Object.values(UserRole).map((role) => ({ value: role, label: capitalize(role) }))

type Props = {
  article?: ArticleModel | null
  articleRevision?: ArticleRevisionModel | null
  isLoading?: boolean
  btnLabel?: string
  isDisabled?: boolean
  onSave?: (form: SaveForm) => void
}

export const ArticleEditablePreview = (props: Props) => {
  const t = useT()
  const { article, articleRevision, isLoading, btnLabel, onSave, isDisabled } = props

  const defaultValues: Form = {
    title: articleRevision?.title ?? null,
    description: articleRevision?.description ?? null,
    thumbnailUrl: articleRevision?.thumbnailUrl ?? null,
    thumbnailAssetId: ((articleRevision?.metadata as { media?: ArticleRevisionMediaMetadata | null } | undefined)?.media?.thumbnail?.assetId as string) ?? null,
    slug: article?.slug ?? null,
    visibility: article?.visibility ? [{ value: article.visibility, label: article.visibility }] : [{ value: ArticleVisibility.PUBLIC, label: 'Public' }],
    allowedRoles: article?.allowedRoles ? article.allowedRoles.map((role) => ({ value: role, label: role })) : [],
  }

  const form = useForm<Form>({
    defaultValues,
    mode: 'onChange',
  })

  const { register, formState, handleSubmit: onSubmit, setValue, watch } = form
  const { errors } = formState
  // eslint-disable-next-line react-hooks/incompatible-library
  const visibility = watch('visibility')
  const slug = watch('slug')

  const isPrivate = visibility?.[0]?.value === ArticleVisibility.PRIVATE

  useEffect(() => {
    if (!isPrivate) {
      setValue('allowedRoles', [], { shouldDirty: true })
    }
  }, [isPrivate, setValue])

  const handleSubmit = useCallback(
    (data: Form) => {
      const finalSlug = data.slug?.trim()?.replace(/^\/+$/, '') ?? null

      const allowedRoles = data.allowedRoles?.map((role) => role.value as UserRole) ?? null

      onSave?.({
        ...data,
        slug: finalSlug,
        allowedRoles: allowedRoles?.length ? allowedRoles : null,
        visibility: data.visibility?.[0]?.value as ArticleVisibility,
        thumbnailAssetId: data.thumbnailAssetId ?? null,
      })
    },
    [onSave],
  )

  return (
    <div className="flex flex-col gap-4">
      {article?.version && (
        <AlertBlock
          notify={{
            type: 'warning',
            message: (
              <Typography variant="Body/S/Regular">
                {t('article.ui.publishedVersion')}: {article?.version}
              </Typography>
            ),
          }}
        />
      )}
      <FormProvider {...form}>
        <form onSubmit={onSubmit(handleSubmit)} className="w-full flex flex-col gap-5">
          <DefaultFieldContainer
            {...handleRegister({
              ...register('title', {
                required: { value: true, message: t('article.errors.titleRequired') },
                maxLength: { value: 180, message: t('article.errors.titleMaxLength') },
              }),
              errors,
              required: true,
            })}
            onChange={(e) => {
              if (!article?.slug) {
                setValue('slug', slugify(e.target.value, { lower: true, strict: true }), { shouldDirty: true })
              }
            }}
            disabled={isLoading || isDisabled}
            label={t('article.ui.articleTitle')}
            name="title"
            hintText={t('article.ui.articleTitleHint')}
          />
          <DefaultTextAreaContainer
            {...handleRegister({
              ...register('description', {
                required: { value: true, message: t('article.errors.descriptionRequired') },
                maxLength: { value: 200, message: t('article.errors.descriptionMaxLength') },
              }),
              errors,
              required: true,
            })}
            disabled={isLoading || isDisabled}
            label={t('article.ui.articleDescription')}
            name="description"
            hintText={t('article.ui.articleDescriptionHint')}
          />
          <MediaUrlUploadField
            label={t('article.ui.articleThumbnailUrl')}
            value={(watch('thumbnailUrl') as string) ?? ''}
            assetId={(watch('thumbnailAssetId') as string) ?? null}
            articleRevisionId={articleRevision?.id ?? null}
            disabled={isLoading || isDisabled}
            resourceType={MediaResourceType.IMAGE}
            variant="thumb"
            onChange={(next) => {
              setValue('thumbnailUrl', next.value || null, { shouldDirty: true })
              setValue('thumbnailAssetId', next.assetId || null, { shouldDirty: true })
            }}
            hintText={t('article.ui.articleThumbnailUrlHint')}
          />
          <DefaultFieldContainer
            {...handleRegister({
              ...register('slug', {
                required: { value: true, message: t('article.errors.slugRequired') },
                pattern: { value: /^[a-z0-9-]+$/, message: t('article.errors.slugPattern') },
              }),
              errors,
              required: true,
            })}
            disabled={isLoading || isDisabled || !!article?.slug}
            label={t('article.ui.articleSlug')}
            name="slug"
            hintText={t('article.ui.articleSlugHint', {
              slug:
                visibility?.[0]?.value === ArticleVisibility.PUBLIC
                  ? `${routes.articlePublic.path?.replace(':slug', slug ?? '')}`
                  : `${routes.articlePrivate.path?.replace(':slug', slug ?? '')}`,
            })}
          />
          <DefaultMultiselectField
            options={visibilityOptions}
            {...handleRegister({
              ...register('visibility', { required: { value: true, message: t('article.errors.visibilityRequired') } }),
              errors,
              required: true,
            })}
            updateBySelected
            disabled={isLoading || isDisabled}
            label={t('article.ui.articleVisibility')}
            name="visibility"
          />
          <AlertBlock
            notify={{
              type: 'warning',
              message: (
                <div className="flex flex-col gap-2">
                  {visibility?.[0]?.value === ArticleVisibility.PRIVATE && (
                    <Typography variant="Body/S/Regular">{t('article.ui.articleVisibilityPrivateHintText')}</Typography>
                  )}
                  {visibility?.[0]?.value === ArticleVisibility.LINK_ONLY && (
                    <Typography variant="Body/S/Regular">{t('article.ui.articleVisibilityLinkOnlyHintText')}</Typography>
                  )}
                  {visibility?.[0]?.value === ArticleVisibility.PUBLIC && (
                    <Typography variant="Body/S/Regular">{t('article.ui.articleVisibilityPublicHintText')}</Typography>
                  )}
                </div>
              ),
            }}
          />
          {isPrivate && (
            <DefaultMultiselectField
              options={allowedRolesOptions}
              {...handleRegister({
                ...register('allowedRoles'),
                errors,
              })}
              maxSelected={10}
              disabled={isLoading || isDisabled}
              label={t('article.ui.allowedRolesForPrivateArticles')}
              name="allowedRoles"
            />
          )}
          <div>
            <Button variant="secondary" size="default" disabled={isLoading || isDisabled}>
              {btnLabel ?? t('common.saveChanges')}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}
