import 'dotenv/config'

/**
 * Reads and validates env vars once at startup so a misconfigured
 * deployment fails immediately with a clear message, instead of failing
 * confusingly the first time something tries to use a missing value
 * (e.g. a DB query throwing "DATABASE_URL is not defined" deep in a
 * connection pool).
 */
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: requireEnv('DATABASE_URL'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret: requireEnv('JWT_SECRET'),
  webhookSecret: requireEnv('WEBHOOK_SECRET'),
}

export const isProduction = config.nodeEnv === 'production'
