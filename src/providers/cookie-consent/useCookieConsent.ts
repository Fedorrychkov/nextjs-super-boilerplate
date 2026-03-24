import { createContext, useContext } from 'react'

import { CookieConsentContextValue } from './cookie-consent-context'

export const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext)

  if (!ctx) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider')
  }

  return ctx
}
