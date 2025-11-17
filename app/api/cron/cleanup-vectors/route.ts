import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-client'
import { executeCronJob, calculateHash } from '@/lib/cron-utils'
import { Logger } from '@/lib/logger'

/**
 * Weekly Vector Database Cleanup Cron Job
 * Runs every Sunday at 3 AM UTC
 * Removes duplicate chunks and orphaned embeddings
 */
export async function POST(request: NextRequest) {
  return executeCronJob(request, 'cleanup-vectors', async () => {
    const startTime = Date.now()
    
    // Step 1: Remove duplicate chunks
    const duplicatesRemoved = await removeDuplicateChunks()
    
    // Step 2: Remove orphaned embeddings
    const orphansRemoved = await removeOrphanedEmbeddings()
    
    // Step 3: Vacuum vector index (PostgreSQL maintenance)
    await vacuumVectorIndex()
    
    const duration = Date.now() - startTime
    
    const summary = {
      duplicatesRemoved,
      orphansRemoved,
      duration,
      timestamp: new Date().toISOString()
    }
    
    Logger.info({
      action: 'VECTOR_CLEANUP_COMPLETED',
      result: 'success',
      duration,
      metadata: summary
    })
    
    return summary
  })
}

/**
 * Remove duplicate chunks (same content hash, same IDE)
 */
async function removeDuplicateChunks(): Promise<number> {
  Logger.info({
    action: 'CLEANUP_DUPLICATES_STARTED',
    metadata: { step: 'finding duplicates' }
  })

  // Find duplicates using SQL
  // Keep the oldest chunk, remove newer ones
  const { data: duplicates, error: dupError } = await supabaseAdmin!
    .rpc('find_duplicate_chunks') as any

  if (dupError) {
    // If RPC doesn't exist, fall back to manual detection
    Logger.warn({
      action: 'CLEANUP_DUPLICATES_RPC_FAILED',
      errorMessage: dupError.message,
      metadata: { fallback: 'manual detection' }
    })
    return await removeDuplicatesManually()
  }

  if (!duplicates || !Array.isArray(duplicates) || duplicates.length === 0) {
    Logger.info({
      action: 'CLEANUP_DUPLICATES_NONE_FOUND',
      metadata: { count: 0 }
    })
    return 0
  }

  // Group duplicates by IDE and hash
  const duplicateGroups = new Map<string, string[]>()
  
  for (const chunk of duplicates as any[]) {
    const hash = calculateHash(chunk.text)
    const key = `${chunk.ide_id}:${hash}`
    
    if (!duplicateGroups.has(key)) {
      duplicateGroups.set(key, [])
    }
    duplicateGroups.get(key)!.push(chunk.id)
  }

  // Remove duplicates (keep the first one in each group)
  let totalRemoved = 0
  
  for (const [key, ids] of Array.from(duplicateGroups.entries())) {
    if (ids.length <= 1) continue
    
    // Keep the first (oldest) chunk, remove the rest
    const idsToRemove = ids.slice(1)
    
    const { error: deleteError } = await supabaseAdmin!
      .from('doc_chunks')
      .delete()
      .in('id', idsToRemove)
    
    if (deleteError) {
      Logger.warn({
        action: 'CLEANUP_DUPLICATES_DELETE_FAILED',
        errorMessage: deleteError.message,
        metadata: { key, count: idsToRemove.length }
      })
    } else {
      totalRemoved += idsToRemove.length
    }
  }

  Logger.info({
    action: 'CLEANUP_DUPLICATES_COMPLETED',
    metadata: { removed: totalRemoved, groups: duplicateGroups.size }
  })

  return totalRemoved
}

/**
 * Manual duplicate detection (fallback if RPC doesn't exist)
 */
async function removeDuplicatesManually(): Promise<number> {
  // Fetch all chunks
  const { data: chunks, error: chunksError } = await supabaseAdmin!
    .from('doc_chunks')
    .select('id, ide_id, text, created_at')
    .order('created_at', { ascending: true })

  if (chunksError || !chunks) {
    throw new Error(`Failed to fetch chunks: ${chunksError?.message}`)
  }

  // Group by IDE and hash
  const chunkMap = new Map<string, string[]>()
  
  for (const chunk of chunks) {
    const hash = calculateHash(chunk.text)
    const key = `${chunk.ide_id}:${hash}`
    
    if (!chunkMap.has(key)) {
      chunkMap.set(key, [])
    }
    chunkMap.get(key)!.push(chunk.id)
  }

  // Find and remove duplicates
  let totalRemoved = 0
  
  for (const [key, ids] of Array.from(chunkMap.entries())) {
    if (ids.length <= 1) continue
    
    // Keep first, remove rest
    const idsToRemove = ids.slice(1)
    
    const { error: deleteError } = await supabaseAdmin!
      .from('doc_chunks')
      .delete()
      .in('id', idsToRemove)
    
    if (!deleteError) {
      totalRemoved += idsToRemove.length
    }
  }

  return totalRemoved
}

/**
 * Remove orphaned embeddings (IDE no longer exists)
 */
async function removeOrphanedEmbeddings(): Promise<number> {
  Logger.info({
    action: 'CLEANUP_ORPHANS_STARTED',
    metadata: { step: 'finding orphans' }
  })

  // Find chunks whose IDE has been deleted or is inactive
  // Fallback: find orphans using NOT IN query
  const { data: activeIDEs, error: idesError } = await supabaseAdmin!
    .from('ides')
    .select('id')
    .eq('status', 'active')

  if (idesError || !activeIDEs) {
    Logger.warn({
      action: 'CLEANUP_ORPHANS_QUERY_FAILED',
      errorMessage: idesError?.message
    })
    return 0
  }

  const activeIDEIds = activeIDEs.map((ide: any) => ide.id)

  if (activeIDEIds.length === 0) {
    Logger.warn({
      action: 'CLEANUP_ORPHANS_NO_ACTIVE_IDES',
      metadata: { message: 'No active IDEs found' }
    })
    return 0
  }

  // Find all chunks not in active IDE list
  const { data: orphanChunks, error: orphanError } = await supabaseAdmin!
    .from('doc_chunks')
    .select('id, ide_id')

  if (orphanError || !orphanChunks) {
    Logger.warn({
      action: 'CLEANUP_ORPHANS_QUERY_FAILED',
      errorMessage: orphanError?.message
    })
    return 0
  }

  // Filter chunks whose IDE is not in active list
  const activeIDESet = new Set(activeIDEIds)
  const orphanIds = orphanChunks
    .filter((chunk: any) => !activeIDESet.has(chunk.ide_id))
    .map((chunk: any) => chunk.id)

  if (orphanIds.length === 0) {
    Logger.info({
      action: 'CLEANUP_ORPHANS_NONE_FOUND',
      metadata: { count: 0 }
    })
    return 0
  }

  // Delete orphans in batches
  const batchSize = 100
  let totalRemoved = 0

  for (let i = 0; i < orphanIds.length; i += batchSize) {
    const batch = orphanIds.slice(i, i + batchSize)

    const { error: deleteError } = await supabaseAdmin!
      .from('doc_chunks')
      .delete()
      .in('id', batch)

    if (deleteError) {
      Logger.warn({
        action: 'CLEANUP_ORPHANS_DELETE_FAILED',
        errorMessage: deleteError.message,
        metadata: { batchStart: i, batchSize: batch.length }
      })
    } else {
      totalRemoved += batch.length
    }
  }

  Logger.info({
    action: 'CLEANUP_ORPHANS_COMPLETED',
    metadata: { removed: totalRemoved }
  })

  return totalRemoved
}

/**
 * Vacuum vector index for performance
 */
async function vacuumVectorIndex(): Promise<void> {
  Logger.info({
    action: 'VACUUM_INDEX_STARTED',
    metadata: { step: 'analyzing table' }
  })

  try {
    // Run VACUUM ANALYZE on doc_chunks table
    // Note: This requires superuser privileges or table owner
    await supabaseAdmin!.rpc('vacuum_doc_chunks_table')
  } catch (error) {
    // If RPC doesn't exist or fails, log warning but don't fail the job
    Logger.warn({
      action: 'VACUUM_INDEX_FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      metadata: { note: 'VACUUM may require elevated privileges' }
    })
  }

  Logger.info({
    action: 'VACUUM_INDEX_COMPLETED',
    metadata: { note: 'PostgreSQL maintenance completed' }
  })
}

// Allow only POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. This endpoint only accepts POST requests.' },
    { status: 405 }
  )
}
