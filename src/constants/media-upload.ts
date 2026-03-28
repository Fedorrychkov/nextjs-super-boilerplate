import type { AppLocale } from '~/lib/i18n/config'

/** Must match `experimental.proxyClientMaxBodySize` in next.config.ts (200mb). */
export const MEDIA_UPLOAD_MAX_BYTES = 200 * 1024 * 1024

function intlLocaleForApp(locale: AppLocale): string {
  return locale === 'ru' ? 'ru-RU' : 'en-US'
}

export function isMediaFileWithinUploadLimit(file: Pick<File, 'size'>): boolean {
  return file.size <= MEDIA_UPLOAD_MAX_BYTES
}

export function formatDataSizeShort(bytes: number, locale: AppLocale): string {
  const il = intlLocaleForApp(locale)
  const mb = bytes / (1024 * 1024)

  if (mb >= 1) {
    return `${new Intl.NumberFormat(il, { maximumFractionDigits: mb >= 10 ? 0 : 1 }).format(mb)} MB`
  }

  const kb = bytes / 1024

  if (kb >= 1) {
    return `${new Intl.NumberFormat(il, { maximumFractionDigits: kb >= 10 ? 0 : 1 }).format(kb)} KB`
  }

  return `${bytes} B`
}

export function formatMediaUploadMaxLabel(locale: AppLocale): string {
  const mb = MEDIA_UPLOAD_MAX_BYTES / (1024 * 1024)
  const il = intlLocaleForApp(locale)

  try {
    return new Intl.NumberFormat(il, { style: 'unit', unit: 'megabyte', unitDisplay: 'short' }).format(mb)
  } catch {
    return `${mb} MB`
  }
}
