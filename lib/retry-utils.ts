import { Logger } from './logger'

export interface RetryOptions {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  jitterFraction?: number
  isRetryable?: (error: Error) => boolean
}

const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_INITIAL_DELAY_MS = 500
const DEFAULT_MAX_DELAY_MS = 30000
const DEFAULT_BACKOFF_MULTIPLIER = 2
const DEFAULT_JITTER_FRACTION = 0.1

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const isNetworkError = (error: Error): boolean => {
  const message = error.message.toLowerCase()
  return (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  )
}

const isRateLimitError = (error: Error): boolean => {
  const message = error.message.toLowerCase()
  return (
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('too many requests')
  )
}

const isServerError = (error: Error): boolean => {
  const message = error.message.toLowerCase()
  return (
    message.includes('503') ||
    message.includes('502') ||
    message.includes('server error') ||
    message.includes('internal error')
  )
}

const isTransientError = (error: Error): boolean => {
  return isNetworkError(error) || isRateLimitError(error) || isServerError(error)
}

export class RetryUtil {
  static async withRetry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T> {
    const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
    const initialDelayMs = options?.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS
    const maxDelayMs = options?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS
    const backoffMultiplier = options?.backoffMultiplier ?? DEFAULT_BACKOFF_MULTIPLIER
    const jitterFraction = options?.jitterFraction ?? DEFAULT_JITTER_FRACTION
    const isRetryable = options?.isRetryable ?? isTransientError

    let lastError: Error | null = null
    let delayMs = initialDelayMs

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        lastError = err

        // Check if this error is retryable
        if (!isRetryable(err)) {
          throw err
        }

        // Don't retry on last attempt
        if (attempt === maxAttempts) {
          throw err
        }

        // Calculate delay with exponential backoff and jitter
        const jitter = Math.random() * jitterFraction * delayMs
        const actualDelayMs = Math.min(delayMs + jitter, maxDelayMs)

        Logger.debug({
          action: 'RETRY_ATTEMPT',
          metadata: {
            attempt,
            maxAttempts,
            delayMs: Math.round(actualDelayMs),
            error: err.message
          }
        })

        await sleep(actualDelayMs)
        delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs)
      }
    }

    throw lastError || new Error('Operation failed after retries')
  }

  static async withLinearRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 500
  ): Promise<T> {
    return this.withRetry(fn, {
      maxAttempts,
      initialDelayMs: delayMs,
      maxDelayMs: delayMs,
      backoffMultiplier: 1,
      jitterFraction: 0.1
    })
  }

  static async withExponentialBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    initialDelayMs: number = 500
  ): Promise<T> {
    return this.withRetry(fn, {
      maxAttempts,
      initialDelayMs,
      backoffMultiplier: 2,
      jitterFraction: 0.1
    })
  }

  static wrapWithRetry<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options?: RetryOptions
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      return this.withRetry(() => fn(...args), options)
    }
  }

  static getDefaultOptions(): RetryOptions {
    return {
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
      initialDelayMs: DEFAULT_INITIAL_DELAY_MS,
      maxDelayMs: DEFAULT_MAX_DELAY_MS,
      backoffMultiplier: DEFAULT_BACKOFF_MULTIPLIER,
      jitterFraction: DEFAULT_JITTER_FRACTION
    }
  }
}

export const withRetry = RetryUtil.withRetry.bind(RetryUtil)
export const withLinearRetry = RetryUtil.withLinearRetry.bind(RetryUtil)
export const withExponentialBackoff = RetryUtil.withExponentialBackoff.bind(RetryUtil)
export const wrapWithRetry = RetryUtil.wrapWithRetry.bind(RetryUtil)

export default RetryUtil
