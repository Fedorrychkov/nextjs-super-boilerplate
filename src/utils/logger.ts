import { isProd as isProduction } from '@config/env'
import { createConsola } from 'consola'

/**
 * Universal logger (server + client).
 * On production: only server logs; client logs are not displayed in the browser console.
 */

const isClient = typeof window !== 'undefined'
const isProd = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_APP_ENV === 'production' || isProduction
const silentClient = isClient && isProd

const consolaInstance = silentClient ? createConsola({ level: -999 }) : createConsola()

export const logger = {
  debug: (...args: unknown[]) => {
    consolaInstance.debug({ date: new Date().toISOString() }, ...args)
  },
  info: (...args: unknown[]) => {
    consolaInstance.info({ date: new Date().toISOString() }, ...args)
  },
  warn: (...args: unknown[]) => {
    consolaInstance.warn({ date: new Date().toISOString() }, ...args)
  },
  error: (...args: unknown[]) => {
    consolaInstance.error({ date: new Date().toISOString() }, ...args)
  },
}

export class Logger {
  private readonly startedString: string

  constructor(
    private readonly _startedString: string[] | string,
    private readonly log?: typeof logger,
  ) {
    this.startedString = Array.isArray(this._startedString) ? this._startedString.join(' | ') : this._startedString
    this.log = log || logger
  }

  warn(...args: unknown[]) {
    this.log?.warn(this.startedString, ...args)
  }

  error(...args: unknown[]) {
    this.log?.error(this.startedString, ...args)
  }

  info(...args: unknown[]) {
    this.log?.info(this.startedString, ...args)
  }

  debug(...args: unknown[]) {
    this.log?.debug(this.startedString, ...args)
  }
}
