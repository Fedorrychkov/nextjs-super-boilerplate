import connectDB from '@lib/db/client'
import RefreshToken from '@lib/db/models/RefreshToken'
import { storedRefreshTokenValue } from '@lib/security/refresh-token-hash'

const BATCH = 500

/**
 * Rewrites rows stored before hashing (`token` is the plain JWT) to the hashed form. Rows of
 * active users are rewritten by their next rotation anyway; this pass covers idle sessions,
 * which otherwise keep a usable plain token in the database until they expire.
 *
 * Idempotent and safe to run from several processes at once: each update matches the plain
 * value it read, so a row already rewritten by another process or a rotation is left alone.
 */
export async function migrateLegacyRefreshTokens(): Promise<number> {
  await connectDB()

  let migrated = 0

  for (;;) {
    const rows = await RefreshToken.find({ token: { $not: /^h:/ } })
      .select('_id token')
      .limit(BATCH)
      .lean()

    if (!rows.length) return migrated

    const result = await RefreshToken.bulkWrite(
      rows.map((row) => ({
        updateOne: {
          filter: { _id: row._id, token: row.token },
          update: { $set: { token: storedRefreshTokenValue(row.token) } },
        },
      })),
      { ordered: false },
    )

    migrated += result.modifiedCount

    if (rows.length < BATCH) return migrated
  }
}
