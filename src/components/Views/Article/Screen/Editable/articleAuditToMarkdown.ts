import type { ArticleAuditResult, ArticleAuditSection } from '~/api/llm'

export type ArticleAuditMarkdownLabels = {
  preview: string
  content: string
  seo: string
  overall: string
  strengths: string
  issues: string
  recommendations: string
}

function sectionBlock(title: string, s: ArticleAuditSection, labels: Pick<ArticleAuditMarkdownLabels, 'strengths' | 'issues' | 'recommendations'>): string {
  const lines = [`## ${title}${s.score != null ? ` (${s.score}/100)` : ''}`, '', s.summary, '']

  if (s.strengths.length) {
    lines.push(`**${labels.strengths}**`, ...s.strengths.map((x) => `- ${x}`), '')
  }

  if (s.issues.length) {
    lines.push(`**${labels.issues}**`, ...s.issues.map((x) => `- ${x}`), '')
  }

  if (s.recommendations.length) {
    lines.push(`**${labels.recommendations}**`, ...s.recommendations.map((x) => `- ${x}`), '')
  }

  return lines.join('\n')
}

export function articleAuditToMarkdown(audit: ArticleAuditResult, labels: ArticleAuditMarkdownLabels): string {
  const sub = { strengths: labels.strengths, issues: labels.issues, recommendations: labels.recommendations }
  const parts = [sectionBlock(labels.preview, audit.preview, sub), sectionBlock(labels.content, audit.content, sub), sectionBlock(labels.seo, audit.seo, sub)]

  if (audit.overall?.trim()) {
    parts.push(`## ${labels.overall}\n\n${audit.overall.trim()}`)
  }

  return parts.join('\n\n---\n\n')
}
