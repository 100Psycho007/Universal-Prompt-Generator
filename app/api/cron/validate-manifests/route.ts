import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-client'
import { executeCronJob, batchProcess } from '@/lib/cron-utils'
import { ManifestBuilder, IDEManifest } from '@/lib/manifest-builder'
import { FormatDetector } from '@/lib/format-detector'
import { Logger } from '@/lib/logger'

interface ValidationResult {
  ideId: string
  ideName: string
  status: 'valid' | 'invalid' | 'regenerated' | 'failed'
  issues?: string[]
  error?: string
}

/**
 * Monthly Manifest Validation Cron Job
 * Runs on the 1st of each month at 4 AM UTC
 * Validates all IDE manifests and regenerates if needed
 */
export async function POST(request: NextRequest) {
  return executeCronJob(request, 'validate-manifests', async () => {
    // Fetch all active IDEs with manifests
    const { data: ides, error: idesError } = await supabaseAdmin!
      .from('ides')
      .select('id, name, docs_url, manifest, created_at, updated_at')
      .eq('status', 'active')

    if (idesError) {
      throw new Error(`Failed to fetch IDEs: ${idesError.message}`)
    }

    if (!ides || ides.length === 0) {
      return {
        message: 'No active IDEs to validate',
        results: []
      }
    }

    Logger.info({
      action: 'MANIFEST_VALIDATION_STARTED',
      metadata: { ideCount: ides.length }
    })

    // Validate each IDE's manifest
    const results = await batchProcess<typeof ides[0], ValidationResult>(
      ides,
      async (ide) => {
        return await validateIDEManifest(ide)
      },
      5 // Process 5 IDEs concurrently
    )

    // Calculate summary
    const summary = {
      totalIDEs: ides.length,
      valid: results.filter(r => r.status === 'valid').length,
      invalid: results.filter(r => r.status === 'invalid').length,
      regenerated: results.filter(r => r.status === 'regenerated').length,
      failed: results.filter(r => r.status === 'failed').length,
      results
    }

    // Log invalid or failed manifests
    const problems = results.filter(r => r.status === 'invalid' || r.status === 'failed')
    if (problems.length > 0) {
      Logger.warn({
        action: 'MANIFEST_VALIDATION_ISSUES',
        metadata: {
          problems: problems.map(p => ({
            name: p.ideName,
            status: p.status,
            issues: p.issues,
            error: p.error
          }))
        }
      })
    }

    return summary
  })
}

/**
 * Validate a single IDE's manifest
 */
async function validateIDEManifest(ide: any): Promise<ValidationResult> {
  const result: ValidationResult = {
    ideId: ide.id,
    ideName: ide.name,
    status: 'valid',
    issues: []
  }

  try {
    // Check if manifest exists
    if (!ide.manifest) {
      result.status = 'invalid'
      result.issues!.push('No manifest exists')
      
      // Try to regenerate
      await regenerateManifest(ide, result)
      return result
    }

    const manifest = ide.manifest as IDEManifest

    // Validate manifest structure
    const structureIssues = validateManifestStructure(manifest)
    if (structureIssues.length > 0) {
      result.issues!.push(...structureIssues)
      result.status = 'invalid'
    }

    // Check if doc_version has changed
    const docVersionChanged = await checkDocVersionChange(ide.id, manifest.doc_version)
    if (docVersionChanged) {
      result.issues!.push('Documentation version has changed')
      result.status = 'invalid'
    }

    // Check if doc sources are still accessible
    const sourceIssues = await validateDocSources(manifest.doc_sources)
    if (sourceIssues.length > 0) {
      result.issues!.push(...sourceIssues)
      // Don't mark as invalid for source issues, just warn
      Logger.warn({
        action: 'MANIFEST_SOURCE_ISSUES',
        metadata: {
          ideId: ide.id,
          ideName: ide.name,
          issues: sourceIssues
        }
      })
    }

    // Check if manifest is too old (> 90 days)
    const manifestAge = Date.now() - new Date(manifest.last_updated).getTime()
    const ninetyDays = 90 * 24 * 60 * 60 * 1000
    if (manifestAge > ninetyDays) {
      result.issues!.push('Manifest is older than 90 days')
      result.status = 'invalid'
    }

    // If invalid, try to regenerate
    if (result.status === 'invalid') {
      await regenerateManifest(ide, result)
    }

  } catch (error) {
    result.status = 'failed'
    result.error = error instanceof Error ? error.message : String(error)
    
    Logger.error({
      action: 'MANIFEST_VALIDATION_FAILED',
      errorMessage: result.error,
      metadata: { ideId: ide.id, ideName: ide.name }
    })
  }

  return result
}

/**
 * Validate manifest structure
 */
function validateManifestStructure(manifest: any): string[] {
  const issues: string[] = []

  // Required fields
  const requiredFields = [
    'id',
    'name',
    'preferred_format',
    'fallback_formats',
    'validation',
    'templates',
    'doc_version',
    'doc_sources',
    'trusted',
    'last_updated'
  ]

  for (const field of requiredFields) {
    if (!(field in manifest)) {
      issues.push(`Missing required field: ${field}`)
    }
  }

  // Validate types
  if (manifest.preferred_format && typeof manifest.preferred_format !== 'string') {
    issues.push('preferred_format must be a string')
  }

  if (manifest.fallback_formats && !Array.isArray(manifest.fallback_formats)) {
    issues.push('fallback_formats must be an array')
  }

  if (manifest.templates && typeof manifest.templates !== 'object') {
    issues.push('templates must be an object')
  }

  if (manifest.doc_sources && !Array.isArray(manifest.doc_sources)) {
    issues.push('doc_sources must be an array')
  }

  // Validate templates have content
  if (manifest.templates && Object.keys(manifest.templates).length === 0) {
    issues.push('templates object is empty')
  }

  return issues
}

/**
 * Check if documentation version has changed
 */
async function checkDocVersionChange(ideId: string, currentVersion: string): Promise<boolean> {
  // Get latest doc chunks
  const { data: latestChunks, error } = await supabaseAdmin!
    .from('doc_chunks')
    .select('version')
    .eq('ide_id', ideId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error || !latestChunks || latestChunks.length === 0) {
    return false
  }

  // Check if any recent chunks have a different version
  const recentVersions = new Set(latestChunks.map(chunk => chunk.version))
  
  // If we have multiple versions or the version doesn't match, it changed
  if (recentVersions.size > 1 || !recentVersions.has(currentVersion)) {
    return true
  }

  return false
}

/**
 * Validate doc sources are still accessible
 */
async function validateDocSources(sources: string[]): Promise<string[]> {
  const issues: string[] = []

  // Sample check on first 3 sources (to avoid too many HTTP requests)
  const samplesToCheck = sources.slice(0, 3)

  for (const source of samplesToCheck) {
    try {
      const response = await fetch(source, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      })

      if (!response.ok) {
        issues.push(`Source unavailable (${response.status}): ${source}`)
      }
    } catch (error) {
      // Network errors are common, don't fail the entire validation
      Logger.debug({
        action: 'MANIFEST_SOURCE_CHECK_FAILED',
        errorMessage: error instanceof Error ? error.message : String(error),
        metadata: { source }
      })
    }
  }

  return issues
}

/**
 * Regenerate manifest for an IDE
 */
async function regenerateManifest(ide: any, result: ValidationResult): Promise<void> {
  try {
    Logger.info({
      action: 'MANIFEST_REGENERATION_STARTED',
      metadata: { ideId: ide.id, ideName: ide.name }
    })

    // Fetch doc chunks for this IDE
    const { data: docChunks, error: chunksError } = await supabaseAdmin!
      .from('doc_chunks')
      .select('*')
      .eq('ide_id', ide.id)
      .limit(1000) // Sample for format detection

    if (chunksError || !docChunks || docChunks.length === 0) {
      throw new Error('No doc chunks available for manifest regeneration')
    }

    // Combine chunks for format detection
    const sampleSize = Math.min(50, docChunks.length)
    const combinedDocumentation = docChunks
      .slice(0, sampleSize)
      .map((chunk: any) => chunk.text)
      .join('\n\n---\n\n')

    // Detect format
    const formatDetector = new FormatDetector({
      enableLLMFallback: false, // Disable LLM for cron jobs to save costs
      minConfidence: 60
    })
    const formatDetection = await formatDetector.detectFormat(ide.id, combinedDocumentation)

    // Build new manifest
    const manifestBuilder = new ManifestBuilder({
      includeAllFormats: true,
      validateTemplates: true
    })

    const newManifest = manifestBuilder.buildManifest(
      ide.id,
      ide.name,
      formatDetection,
      docChunks as any,
      'latest'
    )

    // Save to database
    const { error: updateError } = await supabaseAdmin!
      .from('ides')
      .update({
        manifest: newManifest as any,
        updated_at: new Date().toISOString()
      })
      .eq('id', ide.id)

    if (updateError) {
      throw new Error(`Failed to save manifest: ${updateError.message}`)
    }

    result.status = 'regenerated'
    result.issues!.push('Manifest successfully regenerated')

    Logger.info({
      action: 'MANIFEST_REGENERATION_COMPLETED',
      metadata: { ideId: ide.id, ideName: ide.name }
    })

  } catch (error) {
    result.status = 'failed'
    result.error = error instanceof Error ? error.message : String(error)
    
    Logger.error({
      action: 'MANIFEST_REGENERATION_FAILED',
      errorMessage: result.error,
      metadata: { ideId: ide.id, ideName: ide.name }
    })
  }
}

// Allow only POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. This endpoint only accepts POST requests.' },
    { status: 405 }
  )
}
