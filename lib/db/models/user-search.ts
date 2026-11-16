import mongoose from 'mongoose'

/** Longer than any email; a 10 KB "search" would only make Mongo scan with a huge pattern. */
const MAX_QUERY_LENGTH = 100

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The admin's "find a person" box: a part of the email, case-insensitive, or an exact account id
 * pasted from a log. The text is escaped — a typed `.*` is a literal, not a pattern. Empty input
 * is no condition at all.
 */
export function userSearchCondition(raw: unknown): Record<string, unknown> | null {
  const q = typeof raw === 'string' ? raw.trim().slice(0, MAX_QUERY_LENGTH) : ''

  if (!q) return null

  const byEmail = { email: { $regex: escapeRegex(q.toLowerCase()), $options: 'i' } }

  if (/^[a-f0-9]{24}$/i.test(q) && mongoose.Types.ObjectId.isValid(q)) {
    return { $or: [{ _id: new mongoose.Types.ObjectId(q) }, byEmail] }
  }

  return byEmail
}
