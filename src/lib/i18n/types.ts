import type { en } from './messages/en'

export type I18nMessages = typeof en

type Join<K, P> = K extends string | number ? (P extends string | number ? `${K}.${P}` : never) : never

export type MessageKey<T> = T extends string
  ? never
  : {
      [K in keyof T]-?: T[K] extends string ? K : Join<K, MessageKey<T[K]>>
    }[keyof T]

export type AppMessageKey = MessageKey<I18nMessages>

export type I18nVars = Record<string, string | number | boolean | null | undefined>
