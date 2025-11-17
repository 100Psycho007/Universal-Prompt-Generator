import { NextRequest, NextResponse } from 'next/server'
import { Logger } from './logger'

/**
 * Cron job utilities for authentication, notifications, and scheduling
 */

// Environment variable for cron secret
const CRON_SECRET = process.env.CRON_SECRET || 'dev-cron-secret'

/**
 * Verify that the request is from a trusted cron scheduler (Vercel Cron)
 * Uses Authorization header with bearer token
 */
export function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    Logger.warn({
      action: 'CRON_AUTH_FAILED',
      errorMessage: 'Missing authorization header',
      metadata: { url: request.url }
    })
    return false
  }

  const token = authHeader.replace('Bearer ', '')
  
  if (token !== CRON_SECRET) {
    Logger.warn({
      action: 'CRON_AUTH_FAILED',
      errorMessage: 'Invalid cron secret',
      metadata: { url: request.url }
    })
    return false
  }

  return true
}

/**
 * Create a standardized unauthorized response
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  )
}

/**
 * Send notification on cron job failure
 * Currently logs to admin_logs, can be extended to send emails or Slack messages
 */
export async function notifyFailure(params: {
  jobName: string
  error: string
  metadata?: Record<string, any>
}): Promise<void> {
  const { jobName, error, metadata } = params

  // Log error
  Logger.error({
    action: `CRON_JOB_FAILED_${jobName.toUpperCase()}`,
    errorMessage: error,
    metadata: {
      jobName,
      ...metadata,
      timestamp: new Date().toISOString()
    }
  })

  // TODO: Send Slack notification
  // if (process.env.SLACK_WEBHOOK_URL) {
  //   await fetch(process.env.SLACK_WEBHOOK_URL, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       text: `🚨 Cron Job Failed: ${jobName}`,
  //       blocks: [
  //         {
  //           type: 'section',
  //           text: { type: 'mrkdwn', text: `*Job:* ${jobName}\n*Error:* ${error}` }
  //         }
  //       ]
  //     })
  //   })
  // }

  // TODO: Send email notification
  // if (process.env.ADMIN_EMAIL && process.env.SENDGRID_API_KEY) {
  //   await sendEmail({
  //     to: process.env.ADMIN_EMAIL,
  //     subject: `Cron Job Failed: ${jobName}`,
  //     text: `Job ${jobName} failed with error: ${error}`,
  //     html: `<p><strong>Job:</strong> ${jobName}</p><p><strong>Error:</strong> ${error}</p>`
  //   })
  // }
}

/**
 * Send notification on cron job success
 */
export async function notifySuccess(params: {
  jobName: string
  summary: string
  metadata?: Record<string, any>
}): Promise<void> {
  const { jobName, summary, metadata } = params

  Logger.info({
    action: `CRON_JOB_COMPLETED_${jobName.toUpperCase()}`,
    result: 'success',
    metadata: {
      jobName,
      summary,
      ...metadata,
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * Wrapper for cron job execution with standard error handling
 */
export async function executeCronJob<T>(
  request: NextRequest,
  jobName: string,
  handler: () => Promise<T>
): Promise<NextResponse> {
  // Verify authorization
  if (!verifyCronRequest(request)) {
    return unauthorizedResponse()
  }

  const startTime = Date.now()

  try {
    Logger.info({
      action: `CRON_JOB_STARTED_${jobName.toUpperCase()}`,
      metadata: { jobName }
    })

    const result = await handler()
    const duration = Date.now() - startTime

    await notifySuccess({
      jobName,
      summary: JSON.stringify(result),
      metadata: { duration }
    })

    return NextResponse.json({
      success: true,
      jobName,
      result,
      duration
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    await notifyFailure({
      jobName,
      error: errorMessage,
      metadata: { duration, stack: error instanceof Error ? error.stack : undefined }
    })

    return NextResponse.json(
      {
        success: false,
        jobName,
        error: errorMessage,
        duration
      },
      { status: 500 }
    )
  }
}

/**
 * Calculate content hash for deduplication
 */
export function calculateHash(content: string): string {
  // Simple hash function for content comparison
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

/**
 * Batch process items with concurrency control
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(batch.map(processor))
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        Logger.warn({
          action: 'BATCH_PROCESS_ITEM_FAILED',
          errorMessage: result.reason?.message || 'Unknown error'
        })
      }
    }
  }
  
  return results
}

export default {
  verifyCronRequest,
  unauthorizedResponse,
  notifyFailure,
  notifySuccess,
  executeCronJob,
  calculateHash,
  batchProcess
}
