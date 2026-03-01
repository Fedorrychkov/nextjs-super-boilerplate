import { createConsola } from 'consola'

/**
 * Универсальный логгер (сервер + клиент).
 * На проде: только серверные логи; клиентские в консоль браузера не выводятся.
 */

const isClient = typeof window !== 'undefined'
const isProd = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_APP_ENV === 'production'
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
