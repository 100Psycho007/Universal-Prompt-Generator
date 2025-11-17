import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-client'
import { executeCronJob } from '@/lib/cron-utils'
import { Logger } from '@/lib/logger'

/**
 * Daily Log Archival Cron Job
 * Runs daily at 1 AM UTC
 * Archives old admin_logs (older than 30 days) to archived_admin_logs table
 */
export async function POST(request: NextRequest) {
  return executeCronJob(request, 'archive-logs', async () => {
    const startTime = Date.now()
    
    // Calculate cutoff date (30 days ago)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 30)
    const cutoffISO = cutoffDate.toISOString()
    
    Logger.info({
      action: 'LOG_ARCHIVAL_STARTED',
      metadata: { cutoffDate: cutoffISO }
    })
    
    // Step 1: Count logs to archive
    const { count: logsToArchive, error: countError } = await supabaseAdmin!
      .from('admin_logs')
      .select('id', { count: 'exact', head: true })
      .lt('timestamp', cutoffISO)
    
    if (countError) {
      throw new Error(`Failed to count logs: ${countError.message}`)
    }
    
    if (!logsToArchive || logsToArchive === 0) {
      Logger.info({
        action: 'LOG_ARCHIVAL_NO_LOGS',
        metadata: { message: 'No logs to archive' }
      })
      
      return {
        logsArchived: 0,
        cutoffDate: cutoffISO,
        message: 'No logs older than 30 days'
      }
    }
    
    // Step 2: Fetch old logs in batches
    const batchSize = 1000
    let totalArchived = 0
    let offset = 0
    
    while (true) {
      const { data: oldLogs, error: fetchError } = await supabaseAdmin!
        .from('admin_logs')
        .select('*')
        .lt('timestamp', cutoffISO)
        .order('timestamp', { ascending: true })
        .range(offset, offset + batchSize - 1)
      
      if (fetchError) {
        throw new Error(`Failed to fetch logs: ${fetchError.message}`)
      }
      
      if (!oldLogs || oldLogs.length === 0) {
        break
      }
      
      // Step 3: Insert into archived_admin_logs
      const archivedLogs = oldLogs.map(log => ({
        original_id: log.id,
        action: log.action,
        ide_id: log.ide_id,
        metadata: log.metadata,
        original_timestamp: log.timestamp,
        archived_at: new Date().toISOString()
      }))
      
      const { error: insertError } = await supabaseAdmin!
        .from('archived_admin_logs')
        .insert(archivedLogs)
      
      if (insertError) {
        // Log error but continue with other batches
        Logger.warn({
          action: 'LOG_ARCHIVAL_INSERT_FAILED',
          errorMessage: insertError.message,
          metadata: { 
            batchSize: oldLogs.length,
            offset 
          }
        })
        
        // If insert fails, skip deletion for this batch
        offset += batchSize
        continue
      }
      
      // Step 4: Delete from admin_logs
      const idsToDelete = oldLogs.map(log => log.id)
      
      const { error: deleteError } = await supabaseAdmin!
        .from('admin_logs')
        .delete()
        .in('id', idsToDelete)
      
      if (deleteError) {
        Logger.warn({
          action: 'LOG_ARCHIVAL_DELETE_FAILED',
          errorMessage: deleteError.message,
          metadata: { 
            batchSize: oldLogs.length,
            offset 
          }
        })
      } else {
        totalArchived += oldLogs.length
      }
      
      // Move to next batch
      offset += batchSize
      
      // Safety check to prevent infinite loop
      if (offset > logsToArchive + batchSize) {
        break
      }
    }
    
    const duration = Date.now() - startTime
    
    // Step 5: Compress archived logs (optional - PostgreSQL compression)
    await compressArchivedLogs()
    
    const summary = {
      logsArchived: totalArchived,
      cutoffDate: cutoffISO,
      duration,
      timestamp: new Date().toISOString()
    }
    
    Logger.info({
      action: 'LOG_ARCHIVAL_COMPLETED',
      result: 'success',
      duration,
      metadata: summary
    })
    
    return summary
  })
}

/**
 * Compress archived logs table (PostgreSQL maintenance)
 */
async function compressArchivedLogs(): Promise<void> {
  Logger.info({
    action: 'LOG_COMPRESSION_STARTED',
    metadata: { step: 'analyzing archived table' }
  })
  
  try {
    // Run VACUUM and ANALYZE on archived_admin_logs
    await supabaseAdmin!.rpc('vacuum_archived_logs_table')
    
    Logger.info({
      action: 'LOG_COMPRESSION_COMPLETED',
      metadata: { note: 'PostgreSQL compression applied' }
    })
  } catch (error) {
    // If RPC doesn't exist or fails, log warning but don't fail
    Logger.warn({
      action: 'LOG_COMPRESSION_FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      metadata: { note: 'Compression may require elevated privileges or custom RPC' }
    })
  }
}

/**
 * Optional: Clean up very old archived logs (older than 1 year)
 */
async function cleanupOldArchivedLogs(): Promise<number> {
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const cutoffISO = oneYearAgo.toISOString()
  
  Logger.info({
    action: 'OLD_ARCHIVE_CLEANUP_STARTED',
    metadata: { cutoffDate: cutoffISO }
  })
  
  const { data: deleted, error: deleteError } = await supabaseAdmin!
    .from('archived_admin_logs')
    .delete()
    .lt('original_timestamp', cutoffISO)
    .select('id')
  
  if (deleteError) {
    Logger.warn({
      action: 'OLD_ARCHIVE_CLEANUP_FAILED',
      errorMessage: deleteError.message
    })
    return 0
  }
  
  const count = deleted?.length || 0
  
  Logger.info({
    action: 'OLD_ARCHIVE_CLEANUP_COMPLETED',
    metadata: { deleted: count }
  })
  
  return count
}

// Allow only POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. This endpoint only accepts POST requests.' },
    { status: 405 }
  )
}
