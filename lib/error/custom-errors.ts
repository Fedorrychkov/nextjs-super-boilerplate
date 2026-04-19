export class BruteForceError extends Error {
  statusCode = 429
  retryAfterSeconds?: number

  constructor(message: string, retryAfterSeconds?: number) {
    super(message)
    this.name = 'BruteForceError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export class ValidationError extends Error {
  statusCode = 400
  /** Merged into JSON body as extra fields (e.g. `remainingAttempts`). */
  details?: Record<string, unknown>

  constructor(message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ValidationError'
    this.details = details
  }
}

export class NotFoundError extends Error {
  statusCode = 404

  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401

  constructor(message: string) {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  statusCode = 403

  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}
