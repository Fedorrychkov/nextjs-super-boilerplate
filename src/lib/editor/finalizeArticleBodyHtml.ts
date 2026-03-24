import { sanitizeArticleHtml } from '~/lib/sanitize/articleHtml'

import { makeTaskCheckboxesReadonly } from './readonlyTaskCheckboxes'
import { makeArticleImagesResponsive } from './responsiveArticleImages'

/** Post-processors and HTML sanitization before `dangerouslySetInnerHTML` (public/preview/private article body). */
export const finalizeArticleBodyHtml = (html: string): string => sanitizeArticleHtml(makeArticleImagesResponsive(makeTaskCheckboxesReadonly(html)))
