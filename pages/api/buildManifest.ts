import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-client'
import { FormatDetector } from '@/lib/format-detector'
import { ManifestBuilder } from '@/lib/manifest-builder'
import type { IDEManifest } from '@/lib/manifest-builder'

interface BuildManifestRequest {
  ideId: string
  enableLLMFallback?: boolean
  sampleSize?: number
}

interface BuildManifestResponse {
  message: string
  data: {
    ideId: string
    ideName: string
    manifest: IDEManifest
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BuildManifestResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const { ideId, enableLLMFallback = true, sampleSize = 50 } = req.body as BuildManifestRequest

  if (!ideId) {
    res.status(400).json({ error: 'ideId is required' })
    return
  }

  try {
    // Get IDE information
    const { data: ideData, error: ideError } = await supabaseAdmin
      .from('ides')
      .select('id, name, status')
      .eq('id', ideId)
      .maybeSingle()

    if (ideError) {
      res.status(500).json({ error: ideError.message })
      return
    }

    if (!ideData) {
      res.status(404).json({ error: 'IDE not found' })
      return
    }

    // Get all document chunks for this IDE
    const { data: allChunks, error: chunksError } = await supabaseAdmin
      .from('doc_chunks')
      .select('*')
      .eq('ide_id', ideData.id)

    if (chunksError) {
      res.status(500).json({ error: chunksError.message })
      return
    }

    const chunks = allChunks ?? []

    if (chunks.length === 0) {
      res.status(400).json({
        error: 'No documentation chunks found for this IDE. Please ingest documentation first.'
      })
      return
    }

    // Use sample for format detection
    const sampleChunks = chunks.slice(0, Math.min(sampleSize, chunks.length))

    // Combine chunks for format detection
    const combinedDocumentation = sampleChunks
      .map((chunk) => chunk.text)
      .join('\n\n---\n\n')

    // Perform format detection
    const formatDetector = new FormatDetector({
      enableLLMFallback,
      minConfidence: 60
    })

    const formatDetection = await formatDetector.detectFormat(ideData.id, combinedDocumentation)

    // Get version from chunks
    const version = chunks[0]?.version ?? 'latest'

    // Build manifest
    const manifestBuilder = new ManifestBuilder({
      includeAllFormats: true,
      validateTemplates: true
    })

    const manifest = manifestBuilder.buildManifest(
      ideData.id,
      ideData.name,
      formatDetection,
      chunks,
      version
    )

    // Store manifest in database
    const { error: updateError } = await supabaseAdmin
      .from('ides')
      .update({ manifest: manifest as any })
      .eq('id', ideData.id)

    if (updateError) {
      res.status(500).json({ error: updateError.message })
      return
    }

    res.status(200).json({
      message: 'Manifest built and stored successfully',
      data: {
        ideId: ideData.id,
        ideName: ideData.name,
        manifest
      }
    })
  } catch (error) {
    console.error('Error building manifest:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to build manifest'
    })
  }
}
