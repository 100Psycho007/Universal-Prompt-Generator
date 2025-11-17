import { supabase, supabaseAdmin } from './supabase-client'
import { Database, IDE, DocChunk, UserPrompt, ChatHistory } from '../types/database'

// Database utility functions for common operations

// IDE Management
export class IDEManager {
  static async createIDE(ideData: Database['Insert']['ides']) {
    const { data, error } = await supabaseAdmin
      .from('ides')
      .insert(ideData)
      .select()
      .single()
    
    return { data, error }
  }

  static async updateIDE(id: string, updateData: Database['Update']['ides']) {
    const { data, error } = await supabaseAdmin
      .from('ides')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    return { data, error }
  }

  static async deleteIDE(id: string) {
    const { error } = await supabaseAdmin
      .from('ides')
      .delete()
      .eq('id', id)
    
    return { error }
  }

  static async getIDEsWithDocChunkCount() {
    const { data, error } = await supabase
      .from('ides')
      .select(`
        *,
        doc_chunks(count)
      `)
      .eq('status', 'active')
      .order('name')
    
    return { data, error }
  }
}

// Document Chunk Management
export class DocChunkManager {
  static async createDocChunk(chunkData: Database['Insert']['doc_chunks']) {
    const { data, error } = await supabaseAdmin
      .from('doc_chunks')
      .insert(chunkData)
      .select()
      .single()
    
    return { data, error }
  }

  static async bulkCreateDocChunks(chunks: Database['Insert']['doc_chunks'][]) {
    const { data, error } = await supabaseAdmin
      .from('doc_chunks')
      .insert(chunks)
      .select()
    
    return { data, error }
  }

  static async updateEmbedding(chunkId: string, embedding: number[]) {
    const { data, error } = await supabaseAdmin.rpc('update_doc_chunk_embedding', {
      chunk_id: chunkId,
      new_embedding: embedding
    })
    
    return { data, error }
  }

  static async getDocChunksWithoutEmbedding(ideId?: string) {
    let query = supabaseAdmin
      .from('doc_chunks')
      .select('*')
      .is('embedding', null)
    
    if (ideId) {
      query = query.eq('ide_id', ideId)
    }
    
    const { data, error } = await query
    
    return { data, error }
  }

  static async deleteDocChunksByIDE(ideId: string) {
    const { error } = await supabaseAdmin
      .from('doc_chunks')
      .delete()
      .eq('ide_id', ideId)
    
    return { error }
  }
}

// User Prompt Management
export class UserPromptManager {
  static async getUserPromptStats(userId: string, daysBack = 30) {
    const { data, error } = await supabase
      .from('user_prompts')
      .select('created_at, ide_id')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
    
    if (error) return { data: null, error }
    
    // Calculate statistics
    const stats = {
      totalPrompts: data?.length || 0,
      promptsByIDE: {} as Record<string, number>,
      averagePromptsPerDay: 0,
      mostActiveDay: null as Date | null
    }
    
    if (data && data.length > 0) {
      // Group by IDE
      data.forEach(prompt => {
        const ideId = prompt.ide_id
        stats.promptsByIDE[ideId] = (stats.promptsByIDE[ideId] || 0) + 1
      })
      
      // Calculate daily average
      stats.averagePromptsPerDay = stats.totalPrompts / daysBack
      
      // Find most active day
      const dayCounts = {} as Record<string, number>
      data.forEach(prompt => {
        const day = new Date(prompt.created_at).toDateString()
        dayCounts[day] = (dayCounts[day] || 0) + 1
      })
      
      const mostActiveDayString = Object.entries(dayCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0]
      
      if (mostActiveDayString) {
        stats.mostActiveDay = new Date(mostActiveDayString)
      }
    }
    
    return { data: stats, error: null }
  }

  static async searchUserPrompts(userId: string, query: string) {
    const { data, error } = await supabase
      .from('user_prompts')
      .select(`
        *,
        ide:ides(name)
      `)
      .eq('user_id', userId)
      .or(`task_description.ilike.%${query}%,raw_input.ilike.%${query}%,generated_prompt.ilike.%${query}%`)
      .order('created_at', { ascending: false })
    
    return { data, error }
  }
}

// Chat History Management
export class ChatHistoryManager {
  static async getChatSummary(userId: string) {
    const { data, error } = await supabase
      .from('chat_history')
      .select(`
        id,
        ide_id,
        created_at,
        updated_at,
        message_count:messages,
        ide:ides(name)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    
    if (error) return { data: null, error }
    
    // Process data to get message counts
    const processedData = data?.map(chat => ({
      ...chat,
      message_count: Array.isArray(chat.messages) ? chat.messages.length : 0
    }))
    
    return { data: processedData, error: null }
  }

  static async exportChatHistory(userId: string, format: 'json' | 'csv' = 'json') {
    const { data, error } = await supabase
      .from('chat_history')
      .select(`
        *,
        ide:ides(name)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    
    if (error) return { data: null, error }
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvData = data?.map(chat => ({
        id: chat.id,
        ide_name: chat.ide?.name || 'Unknown',
        message_count: Array.isArray(chat.messages) ? chat.messages.length : 0,
        created_at: chat.created_at,
        updated_at: chat.updated_at
      }))
      
      return { data: csvData, error: null }
    }
    
    return { data, error }
  }

  static async deleteChatHistory(userId: string, chatId?: string) {
    let query = supabase
      .from('chat_history')
      .delete()
      .eq('user_id', userId)
    
    if (chatId) {
      query = query.eq('id', chatId)
    }
    
    const { error } = await query
    
    return { error }
  }
}

// Analytics and Reporting
export class AnalyticsManager {
  static async getPlatformStats() {
    const { data, error } = await supabaseAdmin.rpc('get_ide_statistics')
    
    return { data, error }
  }

  static async getUserActivitySummary(userId: string, daysBack = 30) {
    const { data, error } = await supabase.rpc('get_user_activity_summary', {
      user_id_param: userId,
      days_back: daysBack
    })
    
    return { data, error }
  }

  static async getPopularIDEs(limit = 10) {
    const { data, error } = await supabase
      .from('user_prompts')
      .select(`
        ide_id,
        prompt_count:count,
        ide:ides(name, docs_url)
      `)
      .group('ide_id')
      .order('prompt_count', { ascending: false })
      .limit(limit)
    
    return { data, error }
  }

  static async getSearchAnalytics(daysBack = 30) {
    // This would require additional logging tables for search queries
    // For now, return a placeholder
    const { data, error } = await supabase
      .from('doc_chunks')
      .select('ide_id, created_at')
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
    
    return { data, error }
  }
}

// Database Health and Maintenance
export class DatabaseManager {
  static async checkDatabaseHealth() {
    const checks = {
      vectorExtension: false,
      rlsEnabled: false,
      indexesExist: false,
      functionsExist: false
    }
    
    try {
      // Check vector extension
      const { data: vectorCheck } = await supabase
        .from('pg_extension')
        .select('extname')
        .eq('extname', 'vector')
        .single()
      
      checks.vectorExtension = !!vectorCheck
      
      // Check RLS status
      const { data: rlsCheck } = await supabase
        .from('pg_tables')
        .select('relname, relrowsecurity')
        .in('relname', ['users', 'user_prompts', 'chat_history'])
      
      checks.rlsEnabled = rlsCheck?.every(table => table.relrowsecurity) || false
      
      // Check indexes
      const { data: indexCheck } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .in('indexname', [
          'idx_doc_chunks_ide_id',
          'idx_doc_chunks_embedding',
          'idx_user_prompts_user_id',
          'idx_chat_history_user_id'
        ])
      
      checks.indexesExist = (indexCheck?.length || 0) >= 4
      
      // Check functions
      const { data: functionCheck } = await supabase
        .from('pg_proc')
        .select('proname')
        .in('proname', ['vector_search', 'get_ide_statistics'])
      
      checks.functionsExist = (functionCheck?.length || 0) >= 2
      
    } catch (error) {
      console.error('Database health check failed:', error)
    }
    
    return checks
  }

  static async optimizeDatabase() {
    const operations = [
      'ANALYZE doc_chunks;',
      'ANALYZE user_prompts;',
      'ANALYZE chat_history;',
      'REINDEX INDEX idx_doc_chunks_embedding;',
      'VACUUM ANALYZE;'
    ]
    
    const results = []
    
    for (const operation of operations) {
      try {
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql: operation })
        results.push({ operation, success: !error, error })
      } catch (err) {
        results.push({ operation, success: false, error: err })
      }
    }
    
    return results
  }
}

export default {
  IDEManager,
  DocChunkManager,
  UserPromptManager,
  ChatHistoryManager,
  AnalyticsManager,
  DatabaseManager
}