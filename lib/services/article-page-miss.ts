import { cacheClient } from '@lib/cache'

/**
 * "No public article at this slug", remembered for a minute. The page cache (`unstable_cache`)
 * stores only hits: a remembered miss there could only be dropped with `revalidateTag`, which the
 * worker process cannot call — an article published on schedule would stay a 404. A miss lives
 * here instead, in the cache the worker shares (Redis), and publishing forgets it.
 *
 * Without Redis the cache is per process: the worker cannot reach the app's copy, and a scheduled
 * article shows up within MISS_TTL_SECONDS instead of at once.
 */
export const MISS_TTL_SECONDS = 60

const missKey = (slug: string) => `article-page:miss:${slug}`

export async function isKnownArticleMiss(slug: string): Promise<boolean> {
  return (await cacheClient.get(missKey(slug))) != null
}

export async function rememberArticleMiss(slug: string): Promise<void> {
  await cacheClient.set(missKey(slug), '1', MISS_TTL_SECONDS)
}

export async function forgetArticleMisses(slugs: Iterable<string>): Promise<void> {
  for (const slug of slugs) await cacheClient.del(missKey(slug))
}
