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
      <FormProvider {...form}>
        <form onSubmit={onSubmit(handleSubmit)} className="w-full flex flex-col gap-5">
          <DefaultFieldContainer
            {...handleRegister({
              ...register('title', {
                required: { value: true, message: 'Article title is required' },
                maxLength: { value: 180, message: 'Article title must be less than 180 characters' },
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
            label="Article Title"
            name="title"
            hintText="This text shown in the article preview, search engines and social media. You can change it later in Seo settings."
          />
          <DefaultTextAreaContainer
            {...handleRegister({
              ...register('description', {
                required: { value: true, message: 'Article description is required' },
                maxLength: { value: 200, message: 'Article description must be less than 200 characters' },
              }),
              errors,
              required: true,
            })}
            disabled={isLoading || isDisabled}
            label="Article Description"
            name="description"
            hintText="This is short description of the article. It is shown in the article preview and search engines."
          />
          <MediaUrlUploadField
            label="Article Thumbnail URL"
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
            hintText="Upload/paste/drop image and store CDN proxy URL for article thumbnail."
          />
          <DefaultFieldContainer
            {...handleRegister({
              ...register('slug', {
                required: { value: true, message: 'Article slug is required' },
                pattern: { value: /^[a-z0-9-]+$/, message: 'Article slug must contain only lowercase letters, numbers and hyphens' },
              }),
              errors,
              required: true,
            })}
            disabled={isLoading || isDisabled || !!article?.slug}
            label="Article Slug"
            name="slug"
            hintText={`This is the slug of the article. It is used to generate the article URL. ${slug ? `Current slug: ${visibility?.[0]?.value === ArticleVisibility.PUBLIC ? `${routes.articlePublic.path?.replace(':slug', slug ?? '')}` : `${routes.articlePrivate.path?.replace(':slug', slug ?? '')}`}` : ''}`}
          />
          <DefaultMultiselectField
            options={visibilityOptions}
            {...handleRegister({
              ...register('visibility', { required: { value: true, message: 'Article visibility is required' } }),
              errors,
              required: true,
            })}
            updateBySelected
            disabled={isLoading || isDisabled}
            label="Article Visibility"
            name="visibility"
          />
          <AlertBlock
            notify={{
              type: 'warning',
              message: (
                <div className="flex flex-col gap-2">
                  {visibility?.[0]?.value === ArticleVisibility.PRIVATE && (
                    <Typography variant="Body/S/Regular">If you choose Private, you can choose which roles can access the article.</Typography>
                  )}
                  {visibility?.[0]?.value === ArticleVisibility.LINK_ONLY && (
                    <Typography variant="Body/S/Regular">If you choose Link Only, the article will be accessible via link only.</Typography>
                  )}
                  {visibility?.[0]?.value === ArticleVisibility.PUBLIC && (
                    <Typography variant="Body/S/Regular">If you choose Public, the article will be accessible to everyone.</Typography>
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
              label="Allowed Roles for Private Articles"
              name="allowedRoles"
            />
          )}
          <div>
            <Button variant="secondary" size="default" disabled={isLoading || isDisabled}>
              {btnLabel ?? 'Save Changes'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}
