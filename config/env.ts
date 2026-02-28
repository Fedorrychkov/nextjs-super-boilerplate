const {
  APP_ENV = 'development',
  NEXT_PUBLIC_APP_ENV = 'development',
  JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change',
  JWT_ACCESS_EXPIRES_IN = Number(process.env.JWT_ACCESS_EXPIRES_IN || 3600), // 1 hour
  JWT_REFRESH_EXPIRES_IN = Number(process.env.JWT_REFRESH_EXPIRES_IN || 15724800), // 21 days
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

export { APP_ENV, isDevelop, isProd, isStage, NEXT_PUBLIC_APP_ENV, JWT_CONFIG }
