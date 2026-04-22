import { type AppLocale, getDefaultLocale } from './config'
import { en } from './messages/en'
import { ru } from './messages/ru'
import type { AppMessageKey, I18nMessages, I18nVars } from './types'

function getByPath(obj: unknown, path: string): unknown {
  let cur: any = obj
  for (const part of path.split('.')) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = cur[part]
  }

  return cur
}

function interpolate(template: string, vars?: I18nVars): string {
  if (!vars) return template

  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k]

    if (v === null || v === undefined) return ''

    return String(v)
  })
}

export function getMessages(locale: AppLocale): I18nMessages {
  switch (locale) {
    case 'ru':
      return ru as unknown as I18nMessages
    case 'en':
    default:
      return en
  }
}

export type TFunction = (key: AppMessageKey, vars?: I18nVars) => string

export type I18nOverrideMap = Record<string, string>

export function getT(locale: AppLocale | null | undefined, overrides?: I18nOverrideMap | null): TFunction {
  const effectiveLocale = locale ?? getDefaultLocale()
  const messages = getMessages(effectiveLocale)
  const fallback = en

  return (key, vars) => {
    const override = overrides?.[String(key)]
    const v = (typeof override === 'string' ? override : null) ?? getByPath(messages, key) ?? getByPath(fallback, key)

    if (typeof v !== 'string') return String(key)

    return interpolate(v, vars)
  }
}
