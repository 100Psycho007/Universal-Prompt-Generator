# Error Handling, Logging & Monitoring Implementation Guide

This guide explains how to use the new error handling, logging, and monitoring infrastructure in the Universal IDE Database application.

## Overview

The error handling and monitoring system consists of:

1. **Structured Logging** (`/lib/logger.ts`) - JSON logs with context
2. **Error Handling** (`/lib/error-handler.ts`) - Centralized error management
3. **Retry Logic** (`/lib/retry-utils.ts`) - Exponential backoff for transient failures
4. **Rate Limiting** (`/middleware.ts`) - Per-user and per-IP request limits
5. **Monitoring Dashboard** (`/app/admin/monitor/page.tsx`) - Real-time metrics and alerts

## Structured Logging

### Basic Logging

```typescript
import { Logger } from '@/lib/logger'

// Info log
Logger.info({
  action: 'USER_SIGNUP',
  userId: user.id,
  metadata: {
    email: user.email,
    provider: 'google'
  }
})

// Warning log
Logger.warn({
  action: 'API_DEGRADED',
  errorMessage: 'Slow response time detected',
  metadata: {
    endpoint: '/api/embeddings',
    responseTime: 8000
  }
})

// Error log
Logger.error({
  action: 'DATABASE_ERROR',
  errorMessage: error.message,
  metadata: {
    query: 'SELECT * FROM users',
    retries: 3
  }
})
```

### Specialized Logging Methods

```typescript
// API calls
await Logger.logAPICall({
  userId: user?.id,
  endpoint: '/api/chat',
  method: 'POST',
  statusCode: 200,
  responseTimeMs: 1200,
  metadata: {
    ideId: 'vs-code',
    messageCount: 5
  }
})

// Crawler runs
await Logger.logCrawlerRun({
  ideId: 'vs-code',
  userId: user?.id,
  status: 'completed',
  urlCount: 245,
  chunkCount: 1023,
  duration: 45000
})

// Embedding calls
await Logger.logEmbeddingCall({
  userId: user?.id,
  chunkCount: 100,
  duration: 2500,
  provider: 'openai',
  success: true
})

// LLM calls with cost tracking
await Logger.logLLMCall({
  userId: user?.id,
  model: 'gpt-4o-mini',
  provider: 'openai',
  duration: 1200,
  tokensUsed: {
    prompt: 150,
    completion: 200,
    total: 350
  },
  success: true,
  cost: 0.0005
})

// Vector search
await Logger.logVectorSearch({
  userId: user?.id,
  ideId: 'vs-code',
  duration: 800,
  resultCount: 10,
  success: true
})

// Rate limit violations
await Logger.logRateLimitViolation({
  userId: user?.id,
  ip: clientIP,
  endpoint: '/api/chat',
  limitType: 'user'
})
```

## Error Handling

### Basic Error Handling

```typescript
import { ErrorHandler, ERROR_CODES } from '@/lib/error-handler'

try {
  // Some operation
  const result = await someAsyncOperation()
} catch (error) {
  ErrorHandler.logError(error, { context: 'operation_name' })
  // Handle error appropriately
}
```

### In API Routes

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { ErrorHandler } from '@/lib/error-handler'
import { Logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { userId } = await request.json()

    if (!userId) {
      throw ErrorHandler.createError(
        'VALIDATION_ERROR',
        'userId is required',
        400
      )
    }

    const result = await someOperation(userId)

    const duration = Date.now() - startTime
    await Logger.logAPICall({
      userId,
      endpoint: '/api/my-endpoint',
      method: 'POST',
      statusCode: 200,
      responseTimeMs: duration
    })

    return NextResponse.json(result)
  } catch (error) {
    const { statusCode, userMessage } = ErrorHandler.logError(error, {
      endpoint: '/api/my-endpoint',
      method: 'POST'
    })

    return NextResponse.json(
      { error: { message: userMessage } },
      { status: statusCode }
    )
  }
}
```

## Retry Logic

### Basic Retry with Exponential Backoff

```typescript
import { RetryUtil, withExponentialBackoff } from '@/lib/retry-utils'

// Simple retry with defaults
const result = await withExponentialBackoff(
  () => externalAPICall(),
  3, // max attempts
  500 // initial delay in ms
)

// Wrapping a function
const retryableCall = wrapWithRetry(externalAPICall, {
  maxAttempts: 3,
  initialDelayMs: 500
})
```

## Rate Limiting

### How Rate Limiting Works

The rate limiting middleware enforces:

- **Per-User Limit**: 100 requests per minute
- **Per-IP Limit**: 1000 requests per minute

## Monitoring Dashboard

Access `/admin/monitor` (requires admin role) to view:
- Total API calls and success rates
- Endpoint performance metrics
- Error trends
- Admin action logs

## Best Practices

1. Always log with context including userId, ideId, and relevant metadata
2. Wrap external API calls with retry logic
3. Track performance of critical operations
4. Handle errors gracefully with appropriate fallbacks
5. Log rate limit violations
6. Use user-friendly error messages

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
SENTRY_DSN=optional_sentry_url
LOGS_API_KEY=optional_logs_api_key
```
