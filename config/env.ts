const {
  APP_ENV = 'development',
  APP_INTERNAL_ORIGIN = 'http://127.0.0.1:3000', // e.g. http://127.0.0.1:3000 — used for server-side requests to own API when public hostname is not resolvable (e.g. in Docker)
  NEXT_PUBLIC_APP_ENV = 'development',
  JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change',
  JWT_ACCESS_EXPIRES_IN = Number(process.env.JWT_ACCESS_EXPIRES_IN || 3600), // 1 hour
  JWT_REFRESH_EXPIRES_IN = Number(process.env.JWT_REFRESH_EXPIRES_IN || 15724800), // 21 days
  MONGO_URI = process.env.MONGO_URI || '',
  MONGO_HOST = process.env.MONGO_HOST || 'localhost',
  MONGO_PORT = process.env.MONGO_PORT || '27017',
  MONGO_USER = process.env.MONGO_USER || '',
  MONGO_PASSWORD = process.env.MONGO_PASSWORD || '',
  MONGO_DB = process.env.MONGO_DB || 'app',
  RATE_LIMIT_POINTS = Number(process.env.RATE_LIMIT_POINTS || 100),
  REDIS_URL = process.env.REDIS_URL,
} = process.env

const isDevelop = APP_ENV === 'development'
const isStage = APP_ENV === 'stage'
const isProd = APP_ENV === 'production'

// JWT config
const JWT_CONFIG = {
  secret: JWT_SECRET,
  accessExpiresIn: JWT_ACCESS_EXPIRES_IN,
  refreshExpiresIn: JWT_REFRESH_EXPIRES_IN,
}

// MongoDB: use MONGO_URI (e.g. for Atlas or full DSN) or build from host/port/user/password/db (e.g. local container mongo:27017)
const MONGODB_CONFIG = {
  uri: MONGO_URI || undefined,
  host: MONGO_HOST,
  port: Number(MONGO_PORT) || 27017,
  user: MONGO_USER || undefined,
  password: MONGO_PASSWORD || undefined,
  db: MONGO_DB,
}

const RATE_LIMIT_CONFIG = {
  points: Number(RATE_LIMIT_POINTS || 400),
  duration: 60,
}

export { APP_ENV, APP_INTERNAL_ORIGIN, isDevelop, isProd, isStage, JWT_CONFIG, MONGODB_CONFIG, NEXT_PUBLIC_APP_ENV, RATE_LIMIT_CONFIG, REDIS_URL }
