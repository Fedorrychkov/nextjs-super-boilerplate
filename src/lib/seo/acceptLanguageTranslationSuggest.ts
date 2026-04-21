import { normalizeHreflangPrimaryTag, type PublishedIndexableTranslationMember } from './articleTranslationAlternates'

/** Ordered language tags from `Accept-Language` (quality discarded; RFC-style). */
export function parseAcceptLanguageHeader(header: string | null | undefined): string[] {
  if (!header?.trim()) {
    return []
  }

  const out: string[] = []

  for (const part of header.split(',')) {
    const token = part.trim().split(';')[0]?.trim()

    if (!token) {
      continue
    }

    const norm = token.replace(/_/g, '-').toLowerCase()

    if (norm && !out.includes(norm)) {
      out.push(norm)
    }
  }

  return out
}

function preferenceMatchesMember(pref: string, member: PublishedIndexableTranslationMember): boolean {
  const p = pref.trim().toLowerCase().replace(/_/g, '-')
  const prefPrimary = normalizeHreflangPrimaryTag(p)

  if (prefPrimary && member.hreflangKey === prefPrimary) {
    return true
  }

  const full = (member.localeFull ?? '').trim().toLowerCase()

  if (full && full === p) {
    return true
  }

  if (full && (full.startsWith(`${p}-`) || p.startsWith(`${full}-`))) {
    return true
  }

  return false
}

/**
 * Picks a published sibling URL to suggest when the browser prefers another locale than the current article.
 * Excludes the current slug; requires a different hreflang key than the current page.
 */
export function pickPreferredTranslationFromAcceptLanguage(
  members: PublishedIndexableTranslationMember[],
  currentSlug: string,
  currentHreflangKey: string | null,
  acceptHeader: string | null | undefined,
): PublishedIndexableTranslationMember | null {
  const prefs = parseAcceptLanguageHeader(acceptHeader)

  if (!prefs.length || members.length < 2) {
    return null
  }

  const others = members.filter((m) => m.slug !== currentSlug)

  for (const pref of prefs) {
    for (const m of others) {
      if (currentHreflangKey != null && m.hreflangKey === currentHreflangKey) {
        continue
      }

      if (!preferenceMatchesMember(pref, m)) {
        continue
      }

      return m
    }
  }

  return null
}
