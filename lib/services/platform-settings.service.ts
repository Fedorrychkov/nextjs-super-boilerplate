import {
  isPlatformSettingKey,
  PLATFORM_SETTING_KEYS,
  PLATFORM_SETTINGS,
  type PlatformSettingDefinition,
  type PlatformSettingKey,
  type PlatformSettingValue,
} from '@config/platform-settings'
import { cacheClient } from '@lib/cache'
import connectDB from '@lib/db/client'
import PlatformSetting from '@lib/db/models/PlatformSetting'
import { NotFoundError, ValidationError } from '@lib/error/custom-errors'
import { decryptSecret, encryptSecret } from '@lib/security/keys'
import mongoose from 'mongoose'

import type { PlatformSettingModel } from '~/api/platform-settings/model'

import { effectiveSettingValue, validateSettingValue } from './platform-settings-rules'
import { recordSecurityAuditEvent } from './security-audit.service'

/** Short: a change in the admin drops the entry at once; the TTL only covers a missed drop. */
const CACHE_TTL_SECONDS = 60
const cacheKey = (key: string) => `platform-setting:${key}`

const definitionOf = (key: PlatformSettingKey) => PLATFORM_SETTINGS[key] as PlatformSettingDefinition<unknown>

export const platformSettingsService = {
  /**
   * The value the product uses. A secret stays sealed in the cache and is opened only here: an
   * open key in Redis would be in every cache dump and every `MONITOR`.
   */
  async get<K extends PlatformSettingKey>(key: K): Promise<PlatformSettingValue<K>> {
    const definition = definitionOf(key)
    const open = (stored: unknown) => (definition.secret && typeof stored === 'string' ? decryptSecret(stored, 'platform-settings') : stored)

    const cached = await cacheClient.get(cacheKey(key))

    if (cached !== null) return effectiveSettingValue(definition.spec, definition.defaultValue, open(JSON.parse(cached))) as PlatformSettingValue<K>

    await connectDB()

    const doc = await PlatformSetting.findOne({ key }).lean()
    const stored = doc ? (definition.secret ? (doc.sealed ?? null) : doc.value) : null

    await cacheClient.set(cacheKey(key), JSON.stringify(stored), CACHE_TTL_SECONDS)

    return effectiveSettingValue(definition.spec, definition.defaultValue, open(stored)) as PlatformSettingValue<K>
  },

  /** Every setting for the admin: the definition from code and the value from the database. Secrets: only whether they are set. */
  async list(): Promise<PlatformSettingModel[]> {
    await connectDB()

    const docs = new Map((await PlatformSetting.find().lean()).map((doc) => [doc.key, doc]))

    return PLATFORM_SETTING_KEYS.map((key) => {
      const definition = definitionOf(key)
      const doc = docs.get(key)
      const secret = Boolean(definition.secret)

      return {
        key,
        group: definition.group,
        spec: definition.spec,
        sensitive: Boolean(definition.sensitive),
        secret,
        value: secret ? null : effectiveSettingValue(definition.spec, definition.defaultValue, doc?.value ?? null),
        defaultValue: secret ? null : definition.defaultValue,
        isSet: secret ? Boolean(doc?.sealed) : doc !== undefined,
        updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
        updatedBy: doc?.updatedBy ? String(doc.updatedBy) : null,
      }
    })
  },

  /**
   * Change a setting from the admin. `null` — back to the default (the record is removed). Every
   * change goes to the security audit log: who, which key, before → after (a secret — only set / not set).
   */
  async set(key: string, value: unknown, actorUserId: string): Promise<PlatformSettingModel> {
    if (!isPlatformSettingKey(key)) throw new NotFoundError('SETTING_NOT_FOUND')

    await connectDB()

    const definition = definitionOf(key)
    const before = await PlatformSetting.findOne({ key }).lean()

    if (value === null) {
      await PlatformSetting.deleteOne({ key })
    } else {
      const checked = validateSettingValue(definition.spec, value)

      if (!checked.ok) throw new ValidationError('SETTING_INVALID', { code: checked.code })

      // An empty secret is "remove the secret", not an encrypted empty string.
      const sealed = definition.secret && checked.value !== '' ? encryptSecret(String(checked.value), 'platform-settings') : null

      if (definition.secret && !sealed) {
        await PlatformSetting.deleteOne({ key })
      } else {
        await PlatformSetting.updateOne(
          { key },
          {
            $set: {
              value: definition.secret ? null : checked.value,
              sealed,
              previousValue: definition.secret ? null : (before?.value ?? null),
              updatedBy: new mongoose.Types.ObjectId(actorUserId),
            },
          },
          { upsert: true },
        )
      }
    }

    await cacheClient.del(cacheKey(key))

    const shown = (stored: unknown, sealed: string | null | undefined) => (definition.secret ? (sealed ? 'set' : 'not set') : JSON.stringify(stored ?? null))
    const after = await PlatformSetting.findOne({ key }).lean()

    await recordSecurityAuditEvent({
      action: 'platform_setting_updated',
      actorUserId,
      targetUserId: actorUserId,
      metadata: { key, from: shown(before?.value, before?.sealed), to: shown(after?.value, after?.sealed) },
    })

    return (await this.list()).find((setting) => setting.key === key)!
  },
}
