/**
 * Optional Elastic (or other) template send: body is still required for console / logs / non-template providers.
 * Merge field names must match placeholders in the provider dashboard (e.g. `{code}` → `code`).
 */
export type TransactionalEmailTemplate = {
  name: string
  mergeFields?: Record<string, string>
}

export type TransactionalEmailMessage = {
  to: string
  subject: string
  text: string
  html?: string
  /** When set, Elastic sends via API template; plain `text`/`html` are still used for console and fallbacks. */
  template?: TransactionalEmailTemplate
}

export interface EmailProvider {
  send(message: TransactionalEmailMessage): Promise<void>
}
