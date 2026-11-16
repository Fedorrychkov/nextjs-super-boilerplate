/**
 * Platform settings: values the owner changes in the admin without a release. The list, defaults
 * and rules live in code (`config/platform-settings.ts`); values live in the database.
 *
 * A spec is plain data so both sides use it: the server validates by it, the admin picks an
 * editor by it — a new setting gets a working form without UI code.
 */
export type PlatformSettingSpec =
  | { kind: 'boolean' }
  | { kind: 'int'; min: number; max: number }
  | { kind: 'choice'; options: readonly string[] }
  /** `pattern` — regex source the whole value must match. */
  | { kind: 'text'; maxLength: number; pattern?: string }
  | { kind: 'textList'; maxItems: number; maxLength: number }

export type PlatformSettingGroup = 'metrics'

export type PlatformSettingModel = {
  key: string
  group: PlatformSettingGroup
  spec: PlatformSettingSpec
  /** Affects rights, money or where data goes: the admin asks for confirmation. */
  sensitive: boolean
  /** Stored encrypted and never sent back: the admin sees only whether it is set. */
  secret: boolean
  /** `null` for a secret. */
  value: unknown
  /** `null` for a secret. */
  defaultValue: unknown
  /** Whether a value is stored (otherwise the default applies). */
  isSet: boolean
  updatedAt: string | null
  updatedBy: string | null
}

export type PlatformSettingsListResponse = { items: PlatformSettingModel[] }
