/**
 * Content-Security-Policy, built here and only applied by next.config.ts. Two policies:
 *
 * - **enforced** — the old one minus the sources no code here loads (Yandex Metrika, Google
 *   Analytics / Tag Manager, yclients). An allowed host nobody uses is attack surface only.
 *   `upgrade-insecure-requests` only in production: Safari applies it to http://localhost too and
 *   the dev page loads without styles.
 * - **report-only** — the strict candidate: no `unsafe-eval` in production, no bare `https:` /
 *   `ws:` in `connect-src`. Browsers report violations to CSP_REPORT_PATH instead of blocking;
 *   once the reports are quiet it can become the enforced one, as a separate decision.
 *
 * A fork that loads a third-party script adds its hosts to `THIRD_PARTY` below — both policies
 * pick them up.
 */

export const CSP_REPORT_PATH = '/api/v1/csp-report'
export const CSP_REPORT_GROUP = 'csp'

/** Extra sources per directive, e.g. `{ script: ['https://mc.yandex.ru'], connect: [...] }`. */
type ThirdParty = Partial<Record<'script' | 'connect' | 'img' | 'frame' | 'media' | 'worker', string[]>>

const THIRD_PARTY: ThirdParty = {}

export type CspEnv = { production: boolean; apiOrigin: string | null }

// CSP keywords need single quotes inside the value; built from the char code so both prettier
// and the single-quotes lint rule accept the source.
const quoted = (word: string) => `${String.fromCharCode(39)}${word}${String.fromCharCode(39)}`
const SELF = quoted('self')
const NONE = quoted('none')
const UNSAFE_INLINE = quoted('unsafe-inline')
const UNSAFE_EVAL = quoted('unsafe-eval')

const originOf = (url: string | undefined): string | null => {
  if (!url) return null

  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

export const cspEnv = (env: Record<string, string | undefined>): CspEnv => ({
  production: env.NODE_ENV === 'production',
  apiOrigin: originOf(env.API_URL),
})

const extra = (key: keyof ThirdParty, thirdParty: ThirdParty) => thirdParty[key] ?? []

const join = (directive: string, sources: string[]) => `${directive} ${sources.join(' ')}`

const common = (thirdParty: ThirdParty) => [
  `default-src ${SELF}`,
  `style-src ${SELF} ${UNSAFE_INLINE} https://fonts.googleapis.com`,
  join('img-src', [SELF, 'data:', 'blob:', 'https:', ...extra('img', thirdParty)]),
  `font-src ${SELF} https://fonts.gstatic.com`,
  join('frame-src', [SELF, 'https://www.google.com', 'https://accounts.google.com', ...extra('frame', thirdParty)]),
  `frame-ancestors ${SELF} https://web.telegram.org https://*.telegram.org`,
  join('media-src', [SELF, 'blob:', 'https://ucarecdn.com', ...extra('media', thirdParty)]),
  join('worker-src', [SELF, ...extra('worker', thirdParty)]),
  `child-src ${SELF}`,
  `object-src ${NONE}`,
  `base-uri ${SELF}`,
  `form-action ${SELF}`,
]

const apiSource = (env: CspEnv) => (env.apiOrigin ? [env.apiOrigin] : [])

export const enforcedCsp = (env: CspEnv, thirdParty: ThirdParty = THIRD_PARTY): string =>
  [
    join('script-src', [SELF, UNSAFE_INLINE, UNSAFE_EVAL, ...extra('script', thirdParty)]),
    join('connect-src', [SELF, 'https:', 'wss:', 'ws:', ...apiSource(env), ...extra('connect', thirdParty)]),
    ...common(thirdParty),
    ...(env.production ? ['upgrade-insecure-requests'] : []),
  ].join('; ')

/** `next dev` needs `unsafe-eval` (React Refresh); production does not. */
export const reportOnlyCsp = (env: CspEnv, thirdParty: ThirdParty = THIRD_PARTY): string =>
  [
    join('script-src', [SELF, UNSAFE_INLINE, ...(env.production ? [] : [UNSAFE_EVAL]), ...extra('script', thirdParty)]),
    join('connect-src', [SELF, 'wss:', ...apiSource(env), ...(env.production ? [] : ['ws:']), ...extra('connect', thirdParty)]),
    ...common(thirdParty),
    `report-uri ${CSP_REPORT_PATH}`,
    `report-to ${CSP_REPORT_GROUP}`,
  ].join('; ')
