import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-client'
import { DocChunkManager } from '@/lib/db-utils'
import { crawlDocumentation } from '@/lib/crawler'

interface IngestRequestBody {
  ideId?: string
  ideName?: string
  seedUrls?: string[]
  maxDepth?: number
  maxPages?: number
  version?: string
  replaceExisting?: boolean
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const {
    ideId,
    ideName,
    seedUrls,
    maxDepth,
    maxPages,
    version,
    replaceExisting = false
  } = req.body as IngestRequestBody

  if (!ideId && !ideName) {
    res.status(400).json({ error: 'Missing ideId or ideName' })
    return
  }

  try {
    let ideData: { id: string; name: string; docs_url: string | null } | null = null

    if (ideId) {
      const { data, error } = await supabaseAdmin
        .from('ides')
        .select('id, name, docs_url')
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
        .select('id, name, docs_url')
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

    let urls = seedUrls?.length ? seedUrls : []

    if (urls.length === 0 && ideData.docs_url) {
      urls = [ideData.docs_url]
    }

    if (urls.length === 0) {
      res.status(400).json({ error: 'No seed URLs provided and IDE has no docs_url' })
      return
    }

    if (replaceExisting) {
      await DocChunkManager.deleteDocChunksByIDE(ideData.id)
    }

    const stats = await crawlDocumentation(
      urls[0],
      urls,
      ideData.id,
      version,
      {
        maxDepth,
        maxPages,
        rateLimit: 1000,
        respectRobotsTxt: true,
        exponentialBackoff: true
      }
    )

    res.status(200).json({
      message: 'Crawl completed',
      data: {
        ideId: ideData.id,
        ideName: ideData.name,
        stats
      }
    })
  } catch (error) {
    console.error('Error ingesting IDE documentation:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
