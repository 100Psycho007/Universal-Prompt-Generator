#!/usr/bin/env tsx
/**
 * Seed script for ingesting documentation for 15 AI coding agents
 * 
 * This script:
 * 1. Creates IDE records for all AI agents
 * 2. Crawls their documentation
 * 3. Chunks the content
 * 4. Generates embeddings
 * 5. Updates IDE records with manifest and metadata
 * 
 * Usage: npx tsx scripts/seed-ai-agents.ts
 */

import { supabaseAdmin } from '../lib/supabase-client'
import { DocumentCrawler, type CrawlStats } from '../lib/crawler'
import { EmbeddingService } from '../lib/embeddings'
import { FormatDetector } from '../lib/format-detector'
import { ManifestBuilder } from '../lib/manifest-builder'
import { Logger } from '../lib/logger'
import { RetryUtil } from '../lib/retry-utils'
import { IDEManager, DocChunkManager } from '../lib/db-utils'

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

interface SeedResult {
  agent: string
  success: boolean
  ideId?: string
  chunksCreated?: number
  embeddingsGenerated?: number
  crawlStats?: CrawlStats
  error?: string
  duration?: number
}

async function createIDERecord(agent: AIAgent): Promise<string> {
  const { data, error } = await IDEManager.createIDE({
    name: agent.name,
    docs_url: agent.docUrl,
    status: 'active',
    manifest: {
      description: agent.description,
      url: agent.url,
      doc_url: agent.docUrl
    }
  })

  if (error) {
    // Try to get existing IDE if it already exists
    const { data: existingData } = await supabaseAdmin
      .from('ides')
      .select('id')
      .eq('name', agent.name)
      .single()
    
    if (existingData) {
      Logger.info({
        action: 'IDE_ALREADY_EXISTS',
        metadata: { agent: agent.name, ideId: existingData.id }
      })
      return existingData.id
    }
    
    throw new Error(`Failed to create IDE record: ${error.message}`)
  }

  if (!data) {
    throw new Error('No data returned from IDE creation')
  }

  Logger.info({
    action: 'IDE_CREATED',
    metadata: { agent: agent.name, ideId: data.id }
  })

  return data.id
}

async function crawlAndIngest(agent: AIAgent, ideId: string): Promise<CrawlStats> {
  // Create ingest status record
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
    Logger.info({
      action: 'CRAWL_STARTED',
      metadata: { agent: agent.name, ideId, docUrl: agent.docUrl }
    })

    const crawler = new DocumentCrawler(agent.docUrl, {
      maxPages: agent.crawlOptions?.maxPages ?? 80,
      maxDepth: agent.crawlOptions?.maxDepth ?? 3,
      rateLimit: 1000, // 1 second between requests
      respectRobotsTxt: true,
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      allowedPatterns: agent.crawlOptions?.allowedPatterns ?? []
    })

    const stats = await crawler.crawl([agent.docUrl], ideId)

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

    Logger.info({
      action: 'CRAWL_COMPLETED',
      metadata: {
        agent: agent.name,
        ideId,
        totalPages: stats.totalPages,
        successfulPages: stats.successfulPages,
        chunksStored: stats.storedChunks
      }
    })

    return stats
  } catch (error) {
    // Update ingest status with error
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

async function generateEmbeddings(ideId: string): Promise<number> {
  Logger.info({
    action: 'EMBEDDING_GENERATION_STARTED',
    metadata: { ideId }
  })

  // Get all chunks without embeddings for this IDE
  const { data: chunks, error } = await DocChunkManager.getDocChunksWithoutEmbedding(ideId)

  if (error) {
    throw new Error(`Failed to fetch chunks: ${error.message}`)
  }

  if (!chunks || chunks.length === 0) {
    Logger.info({
      action: 'NO_CHUNKS_TO_EMBED',
      metadata: { ideId }
    })
    return 0
  }

  const embeddingService = new EmbeddingService({
    batchSize: 25,
    maxRetries: 3
  })

  const embeddableChunks = chunks.map(chunk => ({
    id: chunk.id,
    text: chunk.text
  }))

  const results = await embeddingService.generateEmbeddings(embeddableChunks)

  // Update chunks with embeddings in batches
  let successCount = 0
  const batchSize = 50

  for (let i = 0; i < results.length; i += batchSize) {
    const batch = results.slice(i, i + batchSize)
    
    await Promise.all(
      batch.map(async (result) => {
        try {
          await RetryUtil.withExponentialBackoff(
            async () => {
              const { error: updateError } = await supabaseAdmin
                .from('doc_chunks')
                .update({ embedding: result.embedding })
                .eq('id', result.id)
              
              if (updateError) throw updateError
            },
            3,
            500
          )
          successCount++
        } catch (error) {
          Logger.error({
            action: 'EMBEDDING_UPDATE_FAILED',
            errorMessage: error instanceof Error ? error.message : String(error),
            metadata: { chunkId: result.id, ideId }
          })
        }
      })
    )
  }

  Logger.info({
    action: 'EMBEDDING_GENERATION_COMPLETED',
    metadata: {
      ideId,
      totalChunks: chunks.length,
      successfulEmbeddings: successCount
    }
  })

  return successCount
}

async function buildAndUpdateManifest(ideId: string, agentName: string): Promise<void> {
  Logger.info({
    action: 'MANIFEST_BUILD_STARTED',
    metadata: { ideId, agent: agentName }
  })

  // Get all chunks for this IDE
  const { data: chunks, error } = await supabaseAdmin
    .from('doc_chunks')
    .select('*')
    .eq('ide_id', ideId)
    .limit(500) // Sample for format detection

  if (error || !chunks || chunks.length === 0) {
    Logger.warn({
      action: 'MANIFEST_BUILD_SKIPPED',
      errorMessage: 'No chunks found for IDE',
      metadata: { ideId, agent: agentName }
    })
    return
  }

  // Detect format from sample text
  const formatDetector = new FormatDetector()
  const sampleText = chunks.slice(0, 10).map(c => c.text).join('\n\n')
  const formatDetection = await formatDetector.detectFormat(ideId, sampleText)

  // Build manifest
  const manifestBuilder = new ManifestBuilder()
  const manifest = manifestBuilder.buildManifest(
    ideId,
    agentName,
    formatDetection,
    chunks,
    'latest'
  )

  // Update IDE record
  const { error: updateError } = await IDEManager.updateIDE(ideId, {
    manifest: manifest as any,
    doc_count: chunks.length,
    last_ingested_at: new Date().toISOString()
  })

  if (updateError) {
    throw new Error(`Failed to update IDE manifest: ${updateError.message}`)
  }

  Logger.info({
    action: 'MANIFEST_UPDATED',
    metadata: {
      ideId,
      agent: agentName,
      docCount: chunks.length,
      preferredFormat: manifest.preferred_format
    }
  })
}

async function seedAgent(agent: AIAgent): Promise<SeedResult> {
  const startTime = Date.now()
  const result: SeedResult = {
    agent: agent.name,
    success: false
  }

  try {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🚀 Processing: ${agent.name}`)
    console.log(`📚 Documentation: ${agent.docUrl}`)
    console.log(`${'='.repeat(60)}\n`)

    // Step 1: Create IDE record
    console.log('📝 Step 1/4: Creating IDE record...')
    result.ideId = await createIDERecord(agent)
    console.log(`✅ IDE created with ID: ${result.ideId}`)

    // Step 2: Crawl documentation
    console.log('\n🕷️  Step 2/4: Crawling documentation...')
    result.crawlStats = await crawlAndIngest(agent, result.ideId)
    result.chunksCreated = result.crawlStats.storedChunks
    console.log(`✅ Crawled ${result.crawlStats.successfulPages} pages, created ${result.chunksCreated} chunks`)

    if (result.chunksCreated === 0) {
      console.log('⚠️  No chunks created, skipping embedding generation')
      result.success = true
      result.duration = Date.now() - startTime
      return result
    }

    // Step 3: Generate embeddings
    console.log('\n🧠 Step 3/4: Generating embeddings...')
    result.embeddingsGenerated = await generateEmbeddings(result.ideId)
    console.log(`✅ Generated ${result.embeddingsGenerated} embeddings`)

    // Step 4: Build and update manifest
    console.log('\n📋 Step 4/4: Building manifest...')
    await buildAndUpdateManifest(result.ideId, agent.name)
    console.log('✅ Manifest updated')

    result.success = true
    result.duration = Date.now() - startTime
    
    console.log(`\n✨ Successfully seeded ${agent.name} in ${(result.duration / 1000).toFixed(2)}s`)
    
    return result
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error)
    result.duration = Date.now() - startTime
    
    console.error(`\n❌ Failed to seed ${agent.name}: ${result.error}`)
    
    Logger.error({
      action: 'AGENT_SEED_FAILED',
      errorMessage: result.error,
      metadata: { agent: agent.name, ideId: result.ideId }
    })
    
    return result
  }
}

async function main() {
  console.log('\n' + '='.repeat(70))
  console.log('🌱 AI AGENT DOCUMENTATION SEEDING')
  console.log('='.repeat(70))
  console.log(`\nSeeding ${AI_AGENTS.length} AI coding agents...`)
  console.log('This may take 30-60 minutes depending on documentation size.\n')

  const results: SeedResult[] = []
  const startTime = Date.now()

  // Process agents sequentially to avoid rate limiting
  for (const agent of AI_AGENTS) {
    const result = await seedAgent(agent)
    results.push(result)
    
    // Wait between agents to be respectful
    if (results.length < AI_AGENTS.length) {
      console.log('\n⏳ Waiting 5 seconds before next agent...\n')
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }

  const totalDuration = Date.now() - startTime
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  console.log('\n\n' + '='.repeat(70))
  console.log('📊 SEEDING SUMMARY')
  console.log('='.repeat(70))
  console.log(`\n✅ Successful: ${successful}/${AI_AGENTS.length}`)
  console.log(`❌ Failed: ${failed}/${AI_AGENTS.length}`)
  console.log(`⏱️  Total Duration: ${(totalDuration / 1000 / 60).toFixed(2)} minutes\n`)

  if (successful > 0) {
    const totalChunks = results.reduce((sum, r) => sum + (r.chunksCreated ?? 0), 0)
    const totalEmbeddings = results.reduce((sum, r) => sum + (r.embeddingsGenerated ?? 0), 0)
    
    console.log(`📄 Total Chunks Created: ${totalChunks}`)
    console.log(`🧠 Total Embeddings Generated: ${totalEmbeddings}\n`)
  }

  if (failed > 0) {
    console.log('❌ Failed Agents:')
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   • ${r.agent}: ${r.error}`)
      })
    console.log()
  }

  console.log('✅ Successful Agents:')
  results
    .filter(r => r.success)
    .forEach(r => {
      const duration = r.duration ? `${(r.duration / 1000).toFixed(1)}s` : 'N/A'
      console.log(`   • ${r.agent} (${r.chunksCreated ?? 0} chunks, ${duration})`)
    })

  console.log('\n' + '='.repeat(70))
  console.log('🎉 Seeding Complete!')
  console.log('='.repeat(70) + '\n')

  // Log final summary to admin logs
  await supabaseAdmin.from('admin_logs').insert({
    action: 'SEED_AI_AGENTS_COMPLETED',
    metadata: {
      total_agents: AI_AGENTS.length,
      successful: successful,
      failed: failed,
      total_chunks: results.reduce((sum, r) => sum + (r.chunksCreated ?? 0), 0),
      total_embeddings: results.reduce((sum, r) => sum + (r.embeddingsGenerated ?? 0), 0),
      duration_seconds: Math.round(totalDuration / 1000),
      results: results.map(r => ({
        agent: r.agent,
        success: r.success,
        chunks: r.chunksCreated,
        embeddings: r.embeddingsGenerated,
        error: r.error
      }))
    }
  })

  process.exit(failed > 0 ? 1 : 0)
}

// Run the seeding script
main().catch((error) => {
  console.error('\n💥 Fatal error during seeding:')
  console.error(error)
  process.exit(1)
})
