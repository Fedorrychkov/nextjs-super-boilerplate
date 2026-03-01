// Universal logger: works on server and client (no 'use client' — safe to import from RSC and client components).
// NEXT_PUBLIC_APP_ENV is inlined at build time on client and available on server.
const isDevelopment = process.env.NEXT_PUBLIC_APP_ENV === 'development'
const isStage = process.env.NEXT_PUBLIC_APP_ENV === 'stage'
const isEnabled = isDevelopment || isStage

/**
 * Universal logger (server + client).
 * Logs only when NEXT_PUBLIC_APP_ENV is development or stage.
 */
export const logger = {
  debug: (...args: unknown[]) => {
    if (isEnabled) {
      console.log(...args)
    }
  },
  error: (...args: unknown[]) => {
    console.error(...args)
  },
  info: (...args: unknown[]) => {
    if (isEnabled) {
      console.info(...args)
    }
  },
  warn: (...args: unknown[]) => {
    if (isEnabled) {
      console.warn(...args)
    }
  },
}
