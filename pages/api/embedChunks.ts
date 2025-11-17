import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-client'
import { defaultEmbeddingService, type EmbeddableChunk } from '@/lib/embeddings'
import { DocChunkManager } from '@/lib/db-utils'

interface EmbedChunksRequest {
  ideId?: string
  chunkIds?: string[]
  limit?: number | string
  dryRun?: boolean
}

interface EmbedChunksResponse {
  message: string
  data: {
    totalRequested: number
    queued: number
    embedded: number
    failedUpdates: Array<{ id: string; error: string }>
    missingEmbeddings: string[]
    chunkIds: string[]
  }
}

const MAX_LIMIT = 1000

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EmbedChunksResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const { ideId, chunkIds, limit = 250, dryRun = false } = req.body as EmbedChunksRequest

  if (chunkIds && !Array.isArray(chunkIds)) {
    res.status(400).json({ error: 'chunkIds must be an array of strings' })
    return
  }

  if (chunkIds && chunkIds.some((id) => typeof id !== 'string')) {
    res.status(400).json({ error: 'chunkIds must contain only string values' })
    return
  }

  const numericLimit =
    typeof limit === 'string' ? Number.parseInt(limit, 10) : (limit ?? 0)

  if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
    res.status(400).json({ error: 'limit must be a positive number' })
    return
  }

  const boundedLimit = Math.min(numericLimit, MAX_LIMIT)
  const uniqueChunkIds = chunkIds?.length ? Array.from(new Set(chunkIds)) : undefined

  try {
    let query = supabaseAdmin
      .from('doc_chunks')
      .select('id, text, ide_id, section, source_url, version')
      .is('embedding', null)
      .order('created_at', { ascending: true })

    if (ideId) {
      query = query.eq('ide_id', ideId)
    }

    if (uniqueChunkIds?.length) {
      query = query.in('id', uniqueChunkIds)
    }

    query = query.limit(boundedLimit)

    const { data: chunks, error: fetchError } = await query

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    const chunkList = chunks ?? []

    if (chunkList.length === 0) {
      res.status(200).json({
        message: 'No chunks pending embedding',
        data: {
          totalRequested: 0,
          queued: 0,
          embedded: 0,
          failedUpdates: [],
          missingEmbeddings: [],
          chunkIds: []
        }
      })
      return
    }

    const chunkIdsToProcess = chunkList.map((chunk) => chunk.id)

    if (dryRun) {
      res.status(200).json({
        message: 'Dry run: chunks queued for embedding',
        data: {
          totalRequested: chunkList.length,
          queued: chunkList.length,
          embedded: 0,
          failedUpdates: [],
          missingEmbeddings: [],
          chunkIds: chunkIdsToProcess
        }
      })
      return
    }

    const embeddableChunks: EmbeddableChunk[] = chunkList.map((chunk) => ({
      id: chunk.id,
      text: chunk.text
    }))

    const embeddings = await defaultEmbeddingService.generateEmbeddings(embeddableChunks)

    const embeddingMap = new Map(embeddings.map((result) => [result.id, result.embedding]))

    const missingEmbeddings = embeddableChunks
      .filter((chunk) => !embeddingMap.has(chunk.id))
      .map((chunk) => chunk.id)

    const failedUpdates: Array<{ id: string; error: string }> = []
    let embeddedCount = 0

    const embeddingEntries = Array.from(embeddingMap.entries())
    for (let i = 0; i < embeddingEntries.length; i++) {
      const [chunkId, embedding] = embeddingEntries[i]
      try {
        const { data: updated, error: updateError } = await DocChunkManager.updateEmbedding(chunkId, embedding)
        if (updateError || !updated) {
          const message = updateError?.message ?? 'Embedding update failed'
          failedUpdates.push({ id: chunkId, error: message })
        } else {
          embeddedCount += 1
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown embedding update error'
        failedUpdates.push({ id: chunkId, error: message })
      }
    }

    res.status(200).json({
      message: 'Embeddings processed',
      data: {
        totalRequested: chunkList.length,
        queued: embeddableChunks.length,
        embedded: embeddedCount,
        failedUpdates,
        missingEmbeddings,
        chunkIds: chunkIdsToProcess
      }
    })
  } catch (error) {
    console.error('embedChunks error:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process embeddings'
    })
  }
}
