import { ArticleModel, SortBy } from '~/api/article'
import { SortOrder } from '~/api/article-revision'
import { CustomTooltip } from '~/components/Blocks/Tooltip'
import { Typography } from '~/components/ui'
import { useArticleRevisionQuery, useArticlesRevisionListQuery } from '~/query/article'
import { cn } from '~/utils/cn'

type Props = {
  article: Partial<ArticleModel>
  className?: string
}

export const ArticleRevisions = (props: Props) => {
  const { article, className } = props

  const { data: currentRevision } = useArticleRevisionQuery(article.revisionId ?? '', !!article?.revisionId)
  const { data: revisions } = useArticlesRevisionListQuery(
    { articleId: article.id, limit: 1, sortOrder: SortOrder.desc, sortBy: SortBy.createdAt },
    !!article?.id,
  )

  const revision = revisions?.list?.[0] ?? null

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {currentRevision && article?.revisionId ? (
        <div className="flex flex-col gap-1 bg-neutral-600/10 p-2 rounded-md">
          <Typography variant="Body/XS/Regular">Current Revision</Typography>
          <CustomTooltip enableInfoIcon content={<Typography variant="Body/S/Regular">{currentRevision?.description}</Typography>}>
            <Typography variant="Body/S/Regular">{currentRevision?.title}</Typography>
          </CustomTooltip>
        </div>
      ) : (
        <div className="flex flex-col gap-1 bg-neutral-600/10 p-2 rounded-md">
          <Typography variant="Body/XS/Regular">Last Revision</Typography>
          {revision ? (
            <CustomTooltip enableInfoIcon content={<Typography variant="Body/S/Regular">{revision?.description}</Typography>}>
              <Typography variant="Body/S/Regular">{revision?.title}</Typography>
            </CustomTooltip>
          ) : (
            <Typography variant="Body/S/Regular">No revisions</Typography>
          )}
        </div>
      )}
      {!!revisions?.count ? <Typography variant="Body/XS/Regular">Total revisions: {revisions?.count}</Typography> : null}
    </div>
  )
}
