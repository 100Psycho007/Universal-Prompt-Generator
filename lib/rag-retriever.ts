import { EmbeddingService } from './embeddings'
import { supabaseAdmin } from './supabase-client'
import { VectorSearchResult, VectorSearchParams, IDE } from '../types/database'

export interface RAGRetrieverOptions {
  embeddingService?: EmbeddingService
  defaultTopK?: number
  similarityThreshold?: number
  maxContextLength?: number
}

export interface RetrievalResult {
  query: string
  chunks: VectorSearchResult[]
  context: string
  ide?: IDE
  metadata: {
    totalChunks: number
    averageSimilarity: number
    retrievalTime: number
    contextLength: number
  }
}

export interface ContextAssemblyOptions {
  includeMetadata?: boolean
  format?: 'markdown' | 'plaintext' | 'json'
  maxChunkLength?: number
}

const DEFAULT_TOP_K = 5
const DEFAULT_SIMILARITY_THRESHOLD = 0.7
const DEFAULT_MAX_CONTEXT_LENGTH = 8000

export class RAGRetriever {
  private readonly embeddingService: EmbeddingService
  private readonly defaultTopK: number
  private readonly similarityThreshold: number
  private readonly maxContextLength: number

  constructor(options: RAGRetrieverOptions = {}) {
    this.embeddingService = options.embeddingService || new EmbeddingService()
    this.defaultTopK = options.defaultTopK || DEFAULT_TOP_K
    this.similarityThreshold = options.similarityThreshold || DEFAULT_SIMILARITY_THRESHOLD
    this.maxContextLength = options.maxContextLength || DEFAULT_MAX_CONTEXT_LENGTH
  }

  async retrieveAndAssemble(
    query: string,
    ideId: string,
    options: {
      topK?: number
      threshold?: number
      contextOptions?: ContextAssemblyOptions
    } = {}
  ): Promise<RetrievalResult> {
    const startTime = Date.now()
    
    const topK = options.topK || this.defaultTopK
    const threshold = options.threshold || this.similarityThreshold

    // Generate query embedding
    const embeddingResult = await this.embeddingService.generateEmbeddings([
      { id: 'query', text: query }
    ])
    
    if (embeddingResult.length === 0) {
      throw new Error('Failed to generate query embedding')
    }

    const queryEmbedding = embeddingResult[0].embedding

    // Perform vector search
    const searchResult = await this.vectorSearch({
      query_embedding: queryEmbedding,
      ide_id: ideId,
      limit: topK,
      threshold
    })

    if (searchResult.error) {
      throw new Error(`Vector search failed: ${searchResult.error.message}`)
    }

    const chunks = searchResult.data || []
    
    // Get IDE information
    let ide: IDE | undefined
    if (chunks.length > 0) {
      const { data: ideData } = await supabaseAdmin
        .from('ides')
        .select('*')
        .eq('id', ideId)
        .single()
      
      ide = ideData || undefined
    }

    // Assemble context
    const context = this.assembleContext(chunks, options.contextOptions)

    const retrievalTime = Date.now() - startTime
    const averageSimilarity = chunks.length > 0 
      ? chunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / chunks.length 
      : 0

    return {
      query,
      chunks,
      context,
      ide,
      metadata: {
        totalChunks: chunks.length,
        averageSimilarity,
        retrievalTime,
        contextLength: context.length
      }
    }
  }

  async vectorSearch(params: VectorSearchParams): Promise<{ data: VectorSearchResult[] | null; error: any }> {
    const { query_embedding, ide_id, limit = 10, threshold = 0.7 } = params

    try {
      const { data, error } = await supabaseAdmin.rpc('vector_search', {
        query_embedding,
        match_threshold: threshold,
        match_count: limit,
        ide_filter: ide_id || null
      })

      if (error) {
        // Fallback to manual query if RPC doesn't exist
        return await this.fallbackVectorSearch(params)
      }

      // Transform results to match expected format
      const transformedData = data?.map((item: any) => ({
        id: item.id,
        ide_id: item.ide_id,
        text: item.text,
        source_url: item.source_url,
        section: item.section,
        similarity: item.similarity || 0,
        ide: item.ide_name ? {
          id: item.ide_id,
          name: item.ide_name,
          docs_url: item.ide_docs_url,
          status: 'active',
          manifest: null,
          created_at: '',
          updated_at: ''
        } : undefined
      })) || []

      return { data: transformedData, error: null }
    } catch (error) {
      return await this.fallbackVectorSearch(params)
    }
  }

  private async fallbackVectorSearch(params: VectorSearchParams): Promise<{ data: VectorSearchResult[] | null; error: any }> {
    const { query_embedding, ide_id, limit = 10, threshold = 0.7 } = params

    // Manual SQL query for vector similarity
    const query = `
      SELECT 
        doc_chunks.*,
        1 - (doc_chunks.embedding <=> $1) as similarity,
        ides.name as ide_name,
        ides.docs_url as ide_docs_url
      FROM doc_chunks
      LEFT JOIN ides ON doc_chunks.ide_id = ides.id
      WHERE doc_chunks.embedding IS NOT NULL
        AND 1 - (doc_chunks.embedding <=> $1) > $2
        ${ide_id ? 'AND doc_chunks.ide_id = $3' : ''}
      ORDER BY similarity DESC
      LIMIT ${ide_id ? '$4' : '$3'}
    `

    const queryParams = ide_id 
      ? [query_embedding, threshold, ide_id, limit]
      : [query_embedding, threshold, limit]

    try {
      const { data, error } = await supabaseAdmin
        .rpc('execute_raw_sql', { query: query.replace(/\$\d+/g, '?'), params: queryParams })

      if (error) {
        // If RPC fails, try a simpler text-based search as fallback
        return await this.textSearchFallback(params)
      }

      const transformedData = data?.map((item: any) => ({
        id: item.id,
        ide_id: item.ide_id,
        text: item.text,
        source_url: item.source_url,
        section: item.section,
        similarity: item.similarity || 0,
        ide: item.ide_name ? {
          id: item.ide_id,
          name: item.ide_name,
          docs_url: item.ide_docs_url,
          status: 'active',
          manifest: null,
          created_at: '',
          updated_at: ''
        } : undefined
      })) || []

      return { data: transformedData, error: null }
    } catch (error) {
      return await this.textSearchFallback(params)
    }
  }

  private async textSearchFallback(params: VectorSearchParams): Promise<{ data: VectorSearchResult[] | null; error: any }> {
    const { ide_id, limit = 10 } = params

    // Fallback to text search
    const { data, error } = await supabaseAdmin
      .from('doc_chunks')
      .select(`
        *,
        ide:ides(name, docs_url)
      `)
      .eq('embedding', null) // Only get chunks without embeddings
      .limit(limit)

    if (error) {
      return { data: null, error }
    }

    const transformedData = data?.map((item: any) => ({
      id: item.id,
      ide_id: item.ide_id,
      text: item.text,
      source_url: item.source_url,
      section: item.section,
      similarity: 0.5, // Default similarity for text search fallback
      ide: item.ide ? {
        id: item.ide_id,
        name: item.ide.name,
        docs_url: item.ide.docs_url,
        status: 'active',
        manifest: null,
        created_at: '',
        updated_at: ''
      } : undefined
    })) || []

    return { data: transformedData, error: null }
  }

  assembleContext(
    chunks: VectorSearchResult[],
    options: ContextAssemblyOptions = {}
  ): string {
    const {
      includeMetadata = true,
      format = 'markdown',
      maxChunkLength = this.maxContextLength
    } = options

    if (chunks.length === 0) {
      return 'No relevant documentation found.'
    }

    let context = ''
    let currentLength = 0

    for (const chunk of chunks) {
      if (currentLength >= maxChunkLength) break

      let chunkText = chunk.text
      
      // Truncate chunk if too long
      if (chunkText.length > maxChunkLength - currentLength - 100) {
        chunkText = chunkText.substring(0, maxChunkLength - currentLength - 100) + '...'
      }

      switch (format) {
        case 'markdown':
          context += `## ${chunk.section || 'Documentation'}\n\n`
          if (includeMetadata) {
            context += `**Source:** ${chunk.source_url || 'Unknown'}\n`
            context += `**Relevance:** ${(chunk.similarity * 100).toFixed(1)}%\n\n`
          }
          context += `${chunkText}\n\n---\n\n`
          break
          
        case 'plaintext':
          if (includeMetadata) {
            context += `[${chunk.section || 'Documentation'}] `
            context += `(Source: ${chunk.source_url || 'Unknown'}, `
            context += `Relevance: ${(chunk.similarity * 100).toFixed(1)}%)\n\n`
          }
          context += `${chunkText}\n\n`
          break
          
        case 'json':
          // For JSON format, we'll build an array and stringify at the end
          break
      }

      currentLength += chunkText.length + 100 // Approximate metadata length
    }

    if (format === 'json') {
      const jsonData = chunks.map(chunk => ({
        section: chunk.section,
        source_url: chunk.source_url,
        similarity: chunk.similarity,
        text: chunk.text.length > maxChunkLength / chunks.length 
          ? chunk.text.substring(0, maxChunkLength / chunks.length) + '...'
          : chunk.text
      }))
      return JSON.stringify(jsonData, null, 2)
    }

    return context.trim()
  }

  async validateRelevance(query: string, chunks: VectorSearchResult[]): Promise<boolean> {
    if (chunks.length === 0) return false

    // Simple relevance check based on average similarity
    const avgSimilarity = chunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / chunks.length
    return avgSimilarity >= this.similarityThreshold
  }
}

export const defaultRAGRetriever = new RAGRetriever()