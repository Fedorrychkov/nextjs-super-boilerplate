import type { PlatformSettingGroup, PlatformSettingSpec } from '~/api/platform-settings/model'

/**
 * The platform settings registry: every setting the admin can change at runtime. A fork adds its
 * own here — a key, a spec, a default — plus a title and description under
 * `platformSettings.items.<key>` in the locale files; the admin form follows from the spec.
 *
 * Rule: product switches, limits and integrations that differ per deployment go here, not into new
 * env variables. Env keeps what the process needs to start (database, keys, domain).
 */
export type PlatformSettingDefinition<T> = {
  group: PlatformSettingGroup
  spec: PlatformSettingSpec
  defaultValue: T
  sensitive?: boolean
  secret?: boolean
}

const define = <T>(definition: PlatformSettingDefinition<T>) => definition

export const PLATFORM_SETTINGS = {
  /** Where product events and errors go (lib/metrics). `log` needs nothing; `off` drops them. */
  'metrics.sink': define<'log' | 'mongo' | 'posthog' | 'off'>({
    group: 'metrics',
    spec: { kind: 'choice', options: ['log', 'mongo', 'posthog', 'off'] },
    defaultValue: 'log',
    // PostHog means events leave the server: a decision about where data goes.
    sensitive: true,
  }),
  /** Send unexpected server and browser errors to the sink too. */
  'metrics.errors': define<boolean>({ group: 'metrics', spec: { kind: 'boolean' }, defaultValue: true }),
  /** How long the `mongo` sink keeps raw events. */
  'metrics.retentionDays': define<number>({ group: 'metrics', spec: { kind: 'int', min: 7, max: 365 }, defaultValue: 90 }),
  'metrics.posthogHost': define<string>({
    group: 'metrics',
    spec: { kind: 'text', maxLength: 200, pattern: '^https://[^\\s/]+(?::\\d+)?$' },
    defaultValue: 'https://eu.i.posthog.com',
    sensitive: true,
  }),
  'metrics.posthogKey': define<string>({ group: 'metrics', spec: { kind: 'text', maxLength: 200 }, defaultValue: '', secret: true }),
} as const

export type PlatformSettingKey = keyof typeof PLATFORM_SETTINGS
export type PlatformSettingValue<K extends PlatformSettingKey> = (typeof PLATFORM_SETTINGS)[K]['defaultValue']

export const PLATFORM_SETTING_KEYS = Object.keys(PLATFORM_SETTINGS) as PlatformSettingKey[]

export const isPlatformSettingKey = (key: string): key is PlatformSettingKey => Object.hasOwn(PLATFORM_SETTINGS, key)
