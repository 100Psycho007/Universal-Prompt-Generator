import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-client'
import { DocumentCrawler } from '@/lib/crawler'
import { EmbeddingService } from '@/lib/embeddings'
import { FormatDetector } from '@/lib/format-detector'
import { ManifestBuilder } from '@/lib/manifest-builder'
import { Logger } from '@/lib/logger'
import { RetryUtil } from '@/lib/retry-utils'
import { IDEManager, DocChunkManager } from '@/lib/db-utils'
import { ErrorHandler } from '@/lib/error-handler'

interface AIAgent {
  name: string
  url: string
  docUrl: string
  description: string
  crawlOptions?: {
    maxPages?: number
    maxDepth?: number
    allowedPatterns?: RegExp[]
  }
}

const AI_AGENTS: AIAgent[] = [
  {
    name: 'Cursor',
    url: 'https://cursor.com',
    docUrl: 'https://docs.cursor.com/',
    description: 'AI-powered code editor with advanced autocomplete and refactoring capabilities'
  },
  {
    name: 'Claude',
    url: 'https://claude.ai',
    docUrl: 'https://docs.anthropic.com/',
    description: 'Claude is an AI assistant made by Anthropic with advanced reasoning capabilities',
    crawlOptions: {
      maxPages: 100,
      maxDepth: 2
    }
  },
  {
    name: 'Gemini',
    url: 'https://ai.google.dev/',
    docUrl: 'https://ai.google.dev/docs',
    description: 'Google\'s Gemini AI model with multimodal capabilities',
    crawlOptions: {
      maxPages: 120,
      maxDepth: 3
    }
  },
  {
    name: 'GitHub Copilot',
    url: 'https://github.com/features/copilot',
    docUrl: 'https://docs.github.com/en/copilot',
    description: 'AI pair programmer that helps write code faster with intelligent suggestions',
    crawlOptions: {
      maxPages: 100,
      maxDepth: 2,
      allowedPatterns: [/\/copilot/i]
    }
  },
  {
    name: 'Coder',
    url: 'https://coder.com',
    docUrl: 'https://coder.com/docs',
    description: 'Cloud development environments with built-in AI assistance',
    crawlOptions: {
      maxPages: 80
    }
  },
  {
    name: 'Bolt.new',
    url: 'https://bolt.new',
    docUrl: 'https://docs.stackblitz.com/',
    description: 'AI-powered full-stack web development in the browser',
    crawlOptions: {
      maxPages: 60,
      maxDepth: 2
    }
  },
  {
    name: 'Lovable',
    url: 'https://lovable.dev',
    docUrl: 'https://docs.lovable.dev/',
    description: 'AI software engineer that builds full applications from natural language',
    crawlOptions: {
      maxPages: 50
    }
  },
  {
    name: 'Tabnine',
    url: 'https://www.tabnine.com',
    docUrl: 'https://docs.tabnine.com/',
    description: 'AI code completion tool with enterprise features and privacy focus',
    crawlOptions: {
      maxPages: 80
    }
  },
  {
    name: 'Amazon CodeWhisperer',
    url: 'https://aws.amazon.com/codewhisperer/',
    docUrl: 'https://docs.aws.amazon.com/codewhisperer/',
    description: 'AI coding companion from Amazon Web Services with security scanning',
    crawlOptions: {
      maxPages: 100,
      maxDepth: 2,
      allowedPatterns: [/codewhisperer/i]
    }
  },
  {
    name: 'JetBrains AI Assistant',
    url: 'https://www.jetbrains.com/ai/',
    docUrl: 'https://www.jetbrains.com/help/idea/ai-assistant.html',
    description: 'AI assistant integrated into JetBrains IDEs for code generation and analysis',
    crawlOptions: {
      maxPages: 60,
      maxDepth: 2
    }
  },
  {
    name: 'Visual Studio IntelliCode',
    url: 'https://visualstudio.microsoft.com/services/intellicode/',
    docUrl: 'https://learn.microsoft.com/en-us/visualstudio/intellicode/',
    description: 'AI-assisted development for Visual Studio with context-aware suggestions',
    crawlOptions: {
      maxPages: 70,
      maxDepth: 2,
      allowedPatterns: [/intellicode/i]
    }
  },
  {
    name: 'Replit Ghostwriter',
    url: 'https://replit.com',
    docUrl: 'https://docs.replit.com/power-ups/ghostwriter',
    description: 'AI coding assistant integrated into Replit IDE with code explanation',
    crawlOptions: {
      maxPages: 50,
      allowedPatterns: [/ghostwriter/i]
    }
  },
  {
    name: 'Kiro',
    url: 'https://kiro.dev',
    docUrl: 'https://docs.kiro.dev/',
    description: 'AI-powered development environment focused on performance',
    crawlOptions: {
      maxPages: 40
    }
  },
  {
    name: 'cto.new',
    url: 'https://cto.new',
    docUrl: 'https://docs.cto.new/',
    description: 'AI-powered platform for building and deploying full-stack applications',
    crawlOptions: {
      maxPages: 50
    }
  },
  {
    name: 'Qoder',
    url: 'https://qoder.com',
    docUrl: 'https://docs.qoder.com/',
    description: 'AI coding assistant with advanced code understanding and generation',
    crawlOptions: {
      maxPages: 50
    }
  }
]

async function seedSingleAgent(agent: AIAgent) {
  // Create IDE record
  const { data: ideData, error: ideError } = await IDEManager.createIDE({
    name: agent.name,
    docs_url: agent.docUrl,
    status: 'active',
    manifest: {
      description: agent.description,
      url: agent.url,
      doc_url: agent.docUrl
    }
  })

  let ideId: string

  if (ideError) {
    const { data: existingData } = await supabaseAdmin
      .from('ides')
      .select('id')
      .eq('name', agent.name)
      .single()
    
    if (!existingData) {
      throw new Error(`Failed to create/find IDE: ${ideError.message}`)
    }
    
    ideId = existingData.id
  } else {
    ideId = ideData!.id
  }

  // Create ingest status
  const { data: ingestRecord } = await supabaseAdmin
    .from('ingest_status')
    .insert({
      ide_id: ideId,
      status: 'in_progress',
      started_at: new Date().toISOString()
    })
    .select()
    .single()

  try {
    // Crawl documentation
    const crawler = new DocumentCrawler(agent.docUrl, {
      maxPages: agent.crawlOptions?.maxPages ?? 80,
      maxDepth: agent.crawlOptions?.maxDepth ?? 3,
      rateLimit: 1000,
      respectRobotsTxt: true,
      timeout: 30000,
      retryAttempts: 3,
      allowedPatterns: agent.crawlOptions?.allowedPatterns ?? []
    })

    const stats = await crawler.crawl([agent.docUrl], ideId)

    // Generate embeddings
    const { data: chunks } = await DocChunkManager.getDocChunksWithoutEmbedding(ideId)
    
    let embeddingsCount = 0
    if (chunks && chunks.length > 0) {
      const embeddingService = new EmbeddingService({ batchSize: 25, maxRetries: 3 })
      const embeddableChunks = chunks.map(chunk => ({ id: chunk.id, text: chunk.text }))
      const results = await embeddingService.generateEmbeddings(embeddableChunks)
      
      // Update chunks with embeddings
      await Promise.all(
        results.map(async (result) => {
          try {
            await supabaseAdmin
              .from('doc_chunks')
              .update({ embedding: result.embedding })
              .eq('id', result.id)
            embeddingsCount++
          } catch (err) {
            Logger.error({
              action: 'EMBEDDING_UPDATE_FAILED',
              errorMessage: err instanceof Error ? err.message : String(err),
              metadata: { chunkId: result.id }
            })
          }
        })
      )
    }

    // Build manifest
    const { data: allChunks } = await supabaseAdmin
      .from('doc_chunks')
      .select('*')
      .eq('ide_id', ideId)
      .limit(500)

    if (allChunks && allChunks.length > 0) {
      const formatDetector = new FormatDetector()
      const sampleText = allChunks.slice(0, 10).map(c => c.text).join('\n\n')
      const formatDetection = await formatDetector.detectFormat(ideId, sampleText)
      const manifestBuilder = new ManifestBuilder()
      const manifest = manifestBuilder.buildManifest(ideId, agent.name, formatDetection, allChunks, 'latest')
      
      await IDEManager.updateIDE(ideId, {
        manifest: manifest as any,
        doc_count: allChunks.length,
        last_ingested_at: new Date().toISOString()
      })
    }

    // Update ingest status
    if (ingestRecord) {
      await supabaseAdmin
        .from('ingest_status')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          chunks_processed: stats.storedChunks
        })
        .eq('id', ingestRecord.id)
    }

    return {
      success: true,
      ideId,
      chunksCreated: stats.storedChunks,
      embeddingsGenerated: embeddingsCount
    }
  } catch (error) {
    if (ingestRecord) {
      await supabaseAdmin
        .from('ingest_status')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : String(error)
        })
        .eq('id', ingestRecord.id)
    }
    
    throw error
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check if user is admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    // Get specific agent to seed (optional)
    const { searchParams } = new URL(request.url)
    const agentName = searchParams.get('agent')
    
    const agentsToSeed = agentName
      ? AI_AGENTS.filter(a => a.name.toLowerCase() === agentName.toLowerCase())
      : AI_AGENTS

    if (agentsToSeed.length === 0) {
      return NextResponse.json(
        { error: { message: `Agent '${agentName}' not found` } },
        { status: 404 }
      )
    }

    Logger.info({
      action: 'SEED_AGENTS_STARTED',
      metadata: {
        agentCount: agentsToSeed.length,
        agents: agentsToSeed.map(a => a.name)
      }
    })

    const results = []

    for (const agent of agentsToSeed) {
      try {
        const result = await seedSingleAgent(agent)
        results.push({
          agent: agent.name,
          success: true,
          ...result
        })
      } catch (error) {
        results.push({
          agent: agent.name,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
      
      // Wait between agents
      if (results.length < agentsToSeed.length) {
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }

    const duration = Date.now() - startTime
    const successful = results.filter(r => r.success).length

    Logger.info({
      action: 'SEED_AGENTS_COMPLETED',
      duration,
      metadata: {
        total: agentsToSeed.length,
        successful,
        failed: results.length - successful,
        results
      }
    })

    return NextResponse.json({
      success: true,
      message: `Seeded ${successful}/${agentsToSeed.length} agents`,
      results,
      durationMs: duration
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorResult = ErrorHandler.logError(error)
    
    Logger.error({
      action: 'SEED_AGENTS_FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
      duration
    })

    return NextResponse.json(
      {
        error: {
          message: errorResult.userMessage,
          code: errorResult.code
        }
      },
      { status: errorResult.statusCode }
    )
  }
}
