import { Logger } from './logger'

export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    public userMessage: string,
    public details?: Record<string, any>,
    public originalError?: Error
  ) {
    super(userMessage)
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export const ERROR_CODES = {
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  EMBEDDING_FAILED: 'EMBEDDING_FAILED',
  LLM_CALL_FAILED: 'LLM_CALL_FAILED',
  CRAWLER_FAILED: 'CRAWLER_FAILED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT: 'TIMEOUT'
} as const

export class ErrorHandler {
  static createError(
    code: string,
    userMessage: string,
    statusCode: number = 500,
    details?: Record<string, any>,
    originalError?: Error
  ): AppError {
    return new AppError(code, statusCode, userMessage, details, originalError)
  }

  static logError(error: unknown, context?: Record<string, any>) {
    const now = Date.now()
    let errorCode = 'UNKNOWN_ERROR'
    let statusCode = 500
    let userMessage = 'Something went wrong. Please try again.'
    let details: Record<string, any> = {}
    let originalError: Error | undefined

    if (error instanceof AppError) {
      errorCode = error.code
      statusCode = error.statusCode
      userMessage = error.userMessage
      details = error.details || {}
      originalError = error.originalError
    } else if (error instanceof Error) {
      originalError = error
      const message = error.message.toLowerCase()

      if (message.includes('not found')) {
        errorCode = ERROR_CODES.NOT_FOUND
        statusCode = 404
        userMessage = 'The requested resource was not found.'
      } else if (message.includes('unauthorized') || message.includes('unauthenticated')) {
        errorCode = ERROR_CODES.UNAUTHORIZED
        statusCode = 401
        userMessage = 'Please log in to continue.'
      } else if (message.includes('forbidden')) {
        errorCode = ERROR_CODES.FORBIDDEN
        statusCode = 403
        userMessage = 'You do not have permission to perform this action.'
      } else if (message.includes('timeout')) {
        errorCode = ERROR_CODES.TIMEOUT
        statusCode = 408
        userMessage = 'The request took too long. Please try again.'
      } else if (message.includes('embedding')) {
        errorCode = ERROR_CODES.EMBEDDING_FAILED
        statusCode = 503
        userMessage = 'Failed to process embeddings. Please try again later.'
      } else if (message.includes('rate limit')) {
        errorCode = ERROR_CODES.RATE_LIMITED
        statusCode = 429
        userMessage = 'Too many requests. Please wait a moment and try again.'
      } else {
        errorCode = ERROR_CODES.INTERNAL_ERROR
        statusCode = 500
        userMessage = 'Something went wrong. Please try again.'
      }
    } else if (typeof error === 'string') {
      errorCode = ERROR_CODES.INTERNAL_ERROR
      originalError = new Error(error)
    } else {
      errorCode = ERROR_CODES.INTERNAL_ERROR
      originalError = new Error('Unknown error occurred')
    }

    // Log the error
    Logger.error({
      action: 'ERROR_OCCURRED',
      errorMessage: originalError?.message,
      result: 'error',
      metadata: {
        code: errorCode,
        statusCode,
        userMessage,
        context,
        stack: originalError?.stack
      }
    })

    return {
      code: errorCode,
      statusCode,
      userMessage,
      details
    }
  }

  static handleAsync<T>(
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    return fn().catch((error) => {
      this.logError(error, context)
      throw this.createError(
        ERROR_CODES.INTERNAL_ERROR,
        'Something went wrong. Please try again.',
        500,
        {},
        error instanceof Error ? error : new Error(String(error))
      )
    })
  }

  static wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    errorMessage: string = 'Operation failed'
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args)
      } catch (error) {
        this.logError(error, { function: fn.name })
        throw this.createError(
          ERROR_CODES.INTERNAL_ERROR,
          errorMessage,
          500,
          {},
          error instanceof Error ? error : new Error(String(error))
        )
      }
    }
  }

  static getErrorResponse(error: unknown) {
    const errorInfo = this.logError(error)
    return {
      error: {
        code: errorInfo.code,
        message: errorInfo.userMessage
      }
    }
  }

  static getHTTPResponse(error: unknown) {
    const errorInfo = this.logError(error)
    return {
      status: errorInfo.statusCode,
      body: {
        error: {
          code: errorInfo.code,
          message: errorInfo.userMessage
        }
      }
    }
  }
}

export const createErrorResponse = (statusCode: number, message: string, code?: string) => ({
  status: statusCode,
  body: JSON.stringify({
    error: {
      code: code || 'ERROR',
      message
    }
  })
})

export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError
}

export default ErrorHandler
