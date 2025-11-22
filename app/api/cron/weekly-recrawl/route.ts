import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-client'
import { executeCronJob, batchProcess } from '@/lib/cron-utils'
import { crawlDocumentation } from '@/lib/crawler'
import { Logger } from '@/lib/logger'
import { withExponentialBackoff } from '@/lib/retry-utils'

interface RecrawlResult {
  ideId: string
  ideName: string
  status: 'success' | 'failed' | 'skipped'
  chunksAdded: number
  chunksUpdated: number
  error?: string
}

/**
 * Weekly Documentation Re-Crawl Cron Job
 * Runs every Monday at 2 AM UTC
 * Re-crawls all active IDEs and updates documentation
 */
export async function POST(request: NextRequest) {
  return executeCronJob(request, 'weekly-recrawl', async () => {
    // Fetch all active IDEs
    const { data: ides, error: idesError } = await supabaseAdmin!
      .from('ides')
      .select('id, name, docs_url, manifest')
      .eq('status', 'active')

    if (idesError) {
      throw new Error(`Failed to fetch IDEs: ${idesError.message}`)
    }

    if (!ides || ides.length === 0) {
      return {
        message: 'No active IDEs to re-crawl',
        results: []
      }
    }

    Logger.info({
      action: 'WEEKLY_RECRAWL_STARTED',
      metadata: { ideCount: ides.length }
    })

    // Process each IDE
    const results = await batchProcess<typeof ides[0], RecrawlResult>(
      ides,
      async (ide) => {
        return await recrawlIDE(ide)
      },
      2 // Crawl 2 IDEs concurrently to avoid overwhelming servers
    )

    // Calculate summary
    const summary = {
      totalIDEs: ides.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      totalChunksAdded: results.reduce((sum, r) => sum + r.chunksAdded, 0),
      totalChunksUpdated: results.reduce((sum, r) => sum + r.chunksUpdated, 0),
      results
    }

    // Log failures
    const failures = results.filter(r => r.status === 'failed')
    if (failures.length > 0) {
      Logger.warn({
        action: 'WEEKLY_RECRAWL_PARTIAL_FAILURE',
        metadata: {
          failedIDEs: failures.map(f => ({ name: f.ideName, error: f.error }))
        }
      })
    }

    return summary
  })
}

/**
 * Re-crawl a single IDE and detect changes
 */
async function recrawlIDE(ide: any): Promise<RecrawlResult> {
  const result: RecrawlResult = {
    ideId: ide.id,
    ideName: ide.name,
    status: 'skipped',
    chunksAdded: 0,
    chunksUpdated: 0
  }

  try {
    // Skip if no docs URL
    if (!ide.docs_url) {
      result.error = 'No docs_url configured'
      return result
    }

    // Create ingest status record
    const { data: ingestStatus, error: ingestError } = await supabaseAdmin!
      .from('ingest_status')
      .insert({
        ide_id: ide.id,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        chunks_processed: 0
      })
      .select()
      .single()

    if (ingestError) {
      throw new Error(`Failed to create ingest status: ${ingestError.message}`)
    }

    // Get existing chunks for comparison
    const { data: existingChunks, error: chunksError } = await supabaseAdmin!
      .from('doc_chunks')
      .select('id, text, source_url')
      .eq('ide_id', ide.id)

    if (chunksError) {
      throw new Error(`Failed to fetch existing chunks: ${chunksError.message}`)
    }

    const existingChunkMap = new Map(
      (existingChunks || []).map(chunk => [
        `${chunk.source_url}:${chunk.text.substring(0, 100)}`,
        chunk
      ])
    )

    // Crawl documentation with retry logic
    const stats = await withExponentialBackoff(
      async () => {
        return await crawlDocumentation(
          ide.docs_url,
          [ide.docs_url],
          ide.id,
          '1.0',
          {
            maxDepth: 3,
            maxPages: 200,
            rateLimit: 1000,
            respectRobotsTxt: true,
            exponentialBackoff: true
          }
        )
      },
      3,
      2000
    )

    // Get new chunks
    const { data: newChunks, error: newChunksError } = await supabaseAdmin!
      .from('doc_chunks')
      .select('id, text, source_url, created_at')
      .eq('ide_id', ide.id)
      .gte('created_at', ingestStatus.started_at)

    if (newChunksError) {
      throw new Error(`Failed to fetch new chunks: ${newChunksError.message}`)
    }

    // Calculate what's new vs updated
    let chunksAdded = 0
    let chunksUpdated = 0

    for (const chunk of newChunks || []) {
      const key = `${chunk.source_url}:${chunk.text.substring(0, 100)}`
      if (existingChunkMap.has(key)) {
        chunksUpdated++
      } else {
        chunksAdded++
      }
    }

    result.chunksAdded = chunksAdded
    result.chunksUpdated = stats.storedChunks - chunksAdded // Total - new = updated
    result.status = 'success'

    // Update ingest status
    await supabaseAdmin!
      .from('ingest_status')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        chunks_processed: stats.storedChunks
      })
      .eq('id', ingestStatus.id)

    Logger.logCrawlerRun({
      ideId: ide.id,
      status: 'completed',
      urlCount: stats.totalPages,
      chunkCount: stats.storedChunks,
      duration: stats.endTime ? 
        stats.endTime.getTime() - stats.startTime.getTime() : 
        undefined
    })

  } catch (error) {
    result.status = 'failed'
    result.error = error instanceof Error ? error.message : String(error)

    Logger.logCrawlerRun({
      ideId: ide.id,
      status: 'failed',
      error: result.error
    })

    // Update ingest status
    await supabaseAdmin!
      .from('ingest_status')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: result.error
      })
      .eq('ide_id', ide.id)
      .eq('status', 'in_progress')
  }

  return result
}

// Allow only POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. This endpoint only accepts POST requests.' },
    { status: 405 }
  )
}
