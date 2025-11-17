import { supabaseAdmin } from './supabase-client'

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export interface LogContext {
  timestamp?: string
  userId?: string | null
  action: string
  duration?: number
  result?: string
  errorMessage?: string
  metadata?: Record<string, any>
  endpoint?: string
  method?: string
  statusCode?: number
  responseTimeMs?: number
}

export interface StructuredLog extends LogContext {
  level: LogLevel
  timestamp: string
}

const isDevelopment = process.env.NODE_ENV === 'development'

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
}

// Determine minimum log level based on environment
const getMinLogLevel = (): number => {
  if (isDevelopment) return LOG_LEVELS.DEBUG
  return LOG_LEVELS.INFO
}

const minLogLevel = getMinLogLevel()

const formatLog = (log: StructuredLog): string => {
  return JSON.stringify(log)
}

const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= minLogLevel
}

const logToConsole = (level: LogLevel, log: StructuredLog) => {
  const message = formatLog(log)
  
  switch (level) {
    case 'DEBUG':
      console.debug(message)
      break
    case 'INFO':
      console.info(message)
      break
    case 'WARN':
      console.warn(message)
      break
    case 'ERROR':
      console.error(message)
      break
  }
}

const logToSentry = (level: LogLevel, log: StructuredLog) => {
  // If Sentry is configured, send to it (can be added later)
  // For now, this is a placeholder for production monitoring
  if (process.env.SENTRY_DSN && level === 'ERROR') {
    // Will be implemented when Sentry is integrated
  }
}

const logToSupabase = async (level: LogLevel, log: StructuredLog) => {
  // Only store ERROR and WARN logs in Supabase for admin_logs table
  if (level !== 'ERROR' && level !== 'WARN') return

  try {
    if (!supabaseAdmin) {
      console.warn('Supabase admin client not initialized for logging')
      return
    }

    await supabaseAdmin.from('admin_logs').insert({
      action: log.action,
      metadata: {
        level,
        timestamp: log.timestamp,
        userId: log.userId,
        duration: log.duration,
        result: log.result,
        errorMessage: log.errorMessage,
        ...log.metadata
      },
      ide_id: log.metadata?.ideId || null
    })
  } catch (error) {
    console.error('Failed to log to Supabase:', error)
  }
}

export class Logger {
  static log(level: LogLevel, context: LogContext) {
    if (!shouldLog(level)) return

    const timestamp = new Date().toISOString()
    const log: StructuredLog = {
      ...context,
      level,
      timestamp
    }

    logToConsole(level, log)
    logToSentry(level, log)
    logToSupabase(level, log)
  }

  static debug(context: LogContext) {
    this.log('DEBUG', context)
  }

  static info(context: LogContext) {
    this.log('INFO', context)
  }

  static warn(context: LogContext) {
    this.log('WARN', context)
  }

  static error(context: LogContext) {
    this.log('ERROR', context)
  }

  static async logAPICall(context: {
    userId?: string | null
    endpoint: string
    method: string
    statusCode: number
    responseTimeMs: number
    metadata?: Record<string, any>
  }) {
    this.info({
      action: 'API_CALL',
      endpoint: context.endpoint,
      method: context.method,
      statusCode: context.statusCode,
      responseTimeMs: context.responseTimeMs,
      userId: context.userId,
      metadata: context.metadata
    })

    // Also track in api_usage_stats table
    try {
      if (supabaseAdmin) {
        await supabaseAdmin.from('api_usage_stats').insert({
          user_id: context.userId || null,
          endpoint: context.endpoint,
          method: context.method,
          status_code: context.statusCode,
          response_time_ms: context.responseTimeMs
        })
      }
    } catch (error) {
      console.error('Failed to log API usage stats:', error)
    }
  }

  static async logCrawlerRun(context: {
    ideId: string
    userId?: string | null
    status: 'started' | 'completed' | 'failed'
    urlCount?: number
    chunkCount?: number
    duration?: number
    error?: string
  }) {
    const level = context.status === 'failed' ? 'ERROR' : 'INFO'
    this.log(level, {
      action: 'CRAWLER_RUN',
      userId: context.userId,
      duration: context.duration,
      result: context.status,
      errorMessage: context.error,
      metadata: {
        ideId: context.ideId,
        urlCount: context.urlCount,
        chunkCount: context.chunkCount
      }
    })
  }

  static async logEmbeddingCall(context: {
    userId?: string | null
    chunkCount: number
    duration?: number
    provider: 'openrouter' | 'openai'
    success: boolean
    error?: string
  }) {
    const level = context.success ? 'INFO' : 'WARN'
    this.log(level, {
      action: 'EMBEDDING_CALL',
      userId: context.userId,
      duration: context.duration,
      result: context.success ? 'success' : 'failed',
      errorMessage: context.error,
      metadata: {
        provider: context.provider,
        chunkCount: context.chunkCount
      }
    })
  }

  static async logLLMCall(context: {
    userId?: string | null
    model: string
    provider: 'openrouter' | 'openai'
    duration?: number
    tokensUsed?: {
      prompt: number
      completion: number
      total: number
    }
    success: boolean
    error?: string
    cost?: number
  }) {
    const level = context.success ? 'INFO' : 'WARN'
    this.log(level, {
      action: 'LLM_CALL',
      userId: context.userId,
      duration: context.duration,
      result: context.success ? 'success' : 'failed',
      errorMessage: context.error,
      metadata: {
        model: context.model,
        provider: context.provider,
        tokensUsed: context.tokensUsed,
        cost: context.cost
      }
    })
  }

  static async logVectorSearch(context: {
    userId?: string | null
    ideId?: string
    duration?: number
    resultCount: number
    success: boolean
    error?: string
  }) {
    const level = context.success ? 'DEBUG' : 'WARN'
    this.log(level, {
      action: 'VECTOR_SEARCH',
      userId: context.userId,
      duration: context.duration,
      result: context.success ? 'success' : 'failed',
      errorMessage: context.error,
      metadata: {
        ideId: context.ideId,
        resultCount: context.resultCount
      }
    })
  }

  static async logRateLimitViolation(context: {
    userId?: string | null
    ip?: string
    endpoint: string
    limitType: 'user' | 'ip'
  }) {
    this.warn({
      action: 'RATE_LIMIT_VIOLATION',
      userId: context.userId,
      metadata: {
        ip: context.ip,
        endpoint: context.endpoint,
        limitType: context.limitType
      }
    })
  }
}

export default Logger
