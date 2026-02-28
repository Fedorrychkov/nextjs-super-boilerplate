import { MONGODB_CONFIG } from '@config/env'
import mongoose from 'mongoose'

// Кэшируем соединение для переиспользования
type MongooseCache = {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  var mongooseCache: MongooseCache | undefined
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null }

if (!global.mongooseCache) {
  global.mongooseCache = cached
}

/** Сбрасываем кэш только при ошибках подключения — следующий вызов connectDB() переподключится */
function clearCacheOnConnectionError() {
  cached.conn = null
  cached.promise = null
}

function isConnectionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const msg = (err as Error).message?.toLowerCase() ?? ''
  const code = (err as NodeJS.ErrnoException).code ?? ''

  return (
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED' ||
    msg.includes('connection reset') ||
    msg.includes('connection closed') ||
    msg.includes('topology was destroyed') ||
    msg.includes('mongo network error') ||
    (err as { name?: string }).name === 'MongoNetworkError'
  )
}

let connectionListenersAttached = false

function setupConnectionListeners() {
  if (connectionListenersAttached) return

  connectionListenersAttached = true
  mongoose.connection.on('disconnected', () => {
    clearCacheOnConnectionError()
  })
  mongoose.connection.on('error', (err) => {
    if (isConnectionError(err)) {
      clearCacheOnConnectionError()
    }
  })
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    // Формируем connection string
    const mongoUri =
      MONGODB_CONFIG.uri ||
      `mongodb://${MONGODB_CONFIG.user ? `${MONGODB_CONFIG.user}:${MONGODB_CONFIG.password}@` : ''}${MONGODB_CONFIG.host || 'localhost'}:${MONGODB_CONFIG.port || 27017}/${MONGODB_CONFIG.db || 'circle-test'}?authSource=admin`

    cached.promise = mongoose.connect(mongoUri, opts)
  }

  try {
    cached.conn = await cached.promise
    setupConnectionListeners()
  } catch (e) {
    cached.promise = null

    throw e
  }

  return cached.conn
}

export default connectDB
