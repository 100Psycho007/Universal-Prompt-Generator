import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-client'
import { defaultFormatDetector, type FormatDetectionResult, FormatDetector } from '@/lib/format-detector'

interface DetectFormatRequest {
  ideId?: string
  ideName?: string
  sampleSize?: number
  enableLLMFallback?: boolean
}

interface DetectFormatResponse {
  message: string
  data: {
    ideId: string
    ideName: string
    totalChunks: number
    analyzedChunks: number
    formatDetection: FormatDetectionResult
  }
}

const MAX_SAMPLE_SIZE = 50
const DEFAULT_SAMPLE_SIZE = 20

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DetectFormatResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const { 
    ideId, 
    ideName, 
    sampleSize = DEFAULT_SAMPLE_SIZE,
    enableLLMFallback = true 
  } = req.body as DetectFormatRequest

  if (!ideId && !ideName) {
    res.status(400).json({ error: 'Either ideId or ideName must be provided' })
    return
  }

  const numericSampleSize = typeof sampleSize === 'string' 
    ? Number.parseInt(sampleSize, 10) 
    : sampleSize

  if (!Number.isFinite(numericSampleSize) || numericSampleSize <= 0) {
    res.status(400).json({ error: 'sampleSize must be a positive number' })
    return
  }

  const boundedSampleSize = Math.min(numericSampleSize, MAX_SAMPLE_SIZE)

  try {
    // Get IDE information
    let ideData: { id: string; name: string } | null = null

    if (ideId) {
      const { data, error } = await supabaseAdmin
        .from('ides')
        .select('id, name')
        .eq('id', ideId)
        .maybeSingle()

      if (error) {
        res.status(500).json({ error: error.message })
        return
      }

      ideData = data
    } else if (ideName) {
      const { data, error } = await supabaseAdmin
        .from('ides')
        .select('id, name')
        .eq('name', ideName)
        .maybeSingle()

      if (error) {
        res.status(500).json({ error: error.message })
        return
      }

      ideData = data
    }

    if (!ideData) {
      res.status(404).json({ error: 'IDE not found' })
      return
    }

    // Get documentation chunks for analysis
    const { data: chunks, error: chunksError } = await supabaseAdmin
      .from('doc_chunks')
      .select('text, section, source_url')
      .eq('ide_id', ideData.id)
      .order('created_at', { ascending: false })
      .limit(boundedSampleSize)

    if (chunksError) {
      res.status(500).json({ error: chunksError.message })
      return
    }

    const chunkList = chunks ?? []

    if (chunkList.length === 0) {
      res.status(200).json({
        message: 'No documentation found for format analysis',
        data: {
          ideId: ideData.id,
          ideName: ideData.name,
          totalChunks: 0,
          analyzedChunks: 0,
          formatDetection: {
            preferred_format: 'plaintext',
            confidence_score: 0,
            detection_methods_used: ['no-data'],
            fallback_formats: []
          }
        }
      })
      return
    }

    // Combine chunks for analysis
    const combinedDocumentation = chunkList
      .map(chunk => chunk.text)
      .join('\n\n---\n\n')

    // Perform format detection
    const formatDetector = new FormatDetector({
      enableLLMFallback,
      minConfidence: 60
    })

    const formatDetection = await formatDetector.detectFormat(ideData.id, combinedDocumentation)

    // Get total chunk count for context
    const { count: totalChunks, error: countError } = await supabaseAdmin
      .from('doc_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('ide_id', ideData.id)

    if (countError) {
      console.warn('Failed to get total chunk count:', countError.message)
    }

    res.status(200).json({
      message: 'Format detection completed',
      data: {
        ideId: ideData.id,
        ideName: ideData.name,
        totalChunks: totalChunks ?? 0,
        analyzedChunks: chunkList.length,
        formatDetection
      }
    })

  } catch (error) {
    console.error('Format detection error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to detect format'
    })
  }
}