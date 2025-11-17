import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for browser/client-side usage
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)

// Client for server-side usage (admin operations)
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

// Helper functions for common operations

// IDE operations
export const getIDEs = async () => {
  const { data, error } = await supabase
    .from('ides')
    .select('*')
    .eq('status', 'active')
    .order('name')

  return { data, error }
}

export const getIDEById = async (id: string) => {
  const { data, error } = await supabase
    .from('ides')
    .select('*')
    .eq('id', id)
    .single()

  return { data, error }
}

export const getIDEByName = async (name: string) => {
  const { data, error } = await supabase
    .from('ides')
    .select('*')
    .eq('name', name)
    .single()

  return { data, error }
}

// Doc chunk operations
export const getDocChunksByIDE = async (ideId: string) => {
  const { data, error } = await supabase
    .from('doc_chunks')
    .select('*')
    .eq('ide_id', ideId)
    .order('created_at', { ascending: false })

  return { data, error }
}

export const searchDocChunks = async (params: {
  query: string
  ideId?: string
  limit?: number
}) => {
  const { query, ideId, limit = 10 } = params
  
  let queryBuilder = supabase
    .from('doc_chunks')
    .select(`
      *,
      ide:ides(name, docs_url)
    `)
    .textSearch('text', query)
    .limit(limit)

  if (ideId) {
    queryBuilder = queryBuilder.eq('ide_id', ideId)
  }

  const { data, error } = await queryBuilder

  return { data, error }
}

// Vector search function (requires pgvector extension)
export const vectorSearch = async (params: {
  embedding: number[]
  ideId?: string
  limit?: number
  threshold?: number
}) => {
  const { embedding, ideId, limit = 10, threshold = 0.7 } = params

  let query = `
    SELECT 
      doc_chunks.*,
      ide.name as ide_name,
      ide.docs_url as ide_docs_url,
      1 - (doc_chunks.embedding <=> $1) as similarity
    FROM doc_chunks
    LEFT JOIN ides ON doc_chunks.ide_id = ides.id
    WHERE 1 - (doc_chunks.embedding <=> $1) > $2
  `

  const queryParams: any[] = [embedding, threshold]

  if (ideId) {
    query += ` AND doc_chunks.ide_id = $${queryParams.length + 1}`
    queryParams.push(ideId)
  }

  query += ` ORDER BY similarity DESC LIMIT $${queryParams.length + 1}`
  queryParams.push(limit)

  const { data, error } = await supabase.rpc('vector_search', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit,
    ide_filter: ideId || null
  })

  return { data, error }
}

// User operations
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  return { data, error }
}

export const updateUserProfile = async (userId: string, profile: any) => {
  const { data, error } = await supabase
    .from('users')
    .update({ profile })
    .eq('id', userId)
    .select()
    .single()

  return { data, error }
}

// User prompt operations
export const createUserPrompt = async (prompt: {
  user_id: string
  ide_id: string
  task_description: string
  raw_input: string
  generated_prompt: string
}) => {
  const { data, error } = await supabase
    .from('user_prompts')
    .insert(prompt)
    .select()
    .single()

  return { data, error }
}

export const getUserPrompts = async (userId: string, ideId?: string) => {
  let query = supabase
    .from('user_prompts')
    .select(`
      *,
      ide:ides(name, docs_url)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (ideId) {
    query = query.eq('ide_id', ideId)
  }

  const { data, error } = await query

  return { data, error }
}

// Chat history operations
export const createChatHistory = async (chat: {
  user_id: string
  ide_id: string
  messages: any[]
}) => {
  const { data, error } = await supabase
    .from('chat_history')
    .insert(chat)
    .select()
    .single()

  return { data, error }
}

export const updateChatHistory = async (chatId: string, messages: any[]) => {
  const { data, error } = await supabase
    .from('chat_history')
    .update({ messages })
    .eq('id', chatId)
    .select()
    .single()

  return { data, error }
}

export const getChatHistory = async (userId: string, ideId?: string) => {
  let query = supabase
    .from('chat_history')
    .select(`
      *,
      ide:ides(name, docs_url)
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (ideId) {
    query = query.eq('ide_id', ideId)
  }

  const { data, error } = await query

  return { data, error }
}

export const getChatHistoryById = async (chatId: string) => {
  const { data, error } = await supabase
    .from('chat_history')
    .select(`
      *,
      ide:ides(name, docs_url)
    `)
    .eq('id', chatId)
    .single()

  return { data, error }
}

// Admin operations (require service role)
export const createAdminLog = async (log: {
  action: string
  ide_id?: string
  metadata?: any
}) => {
  const { data, error } = await supabaseAdmin
    .from('admin_logs')
    .insert(log)
    .select()
    .single()

  return { data, error }
}

export const getAdminLogs = async (ideId?: string, limit = 50) => {
  let query = supabaseAdmin
    .from('admin_logs')
    .select(`
      *,
      ide:ides(name)
    `)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (ideId) {
    query = query.eq('ide_id', ideId)
  }

  const { data, error } = await query

  return { data, error }
}

// Utility functions
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error)
  return error?.message || 'An unknown error occurred'
}

export const checkRowLevelSecurity = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .limit(1)

  return { data, error }
}

// Realtime subscriptions
export const subscribeToChatHistory = (
  chatId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`chat_history_${chatId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'chat_history',
        filter: `id=eq.${chatId}`
      },
      callback
    )
    .subscribe()
}

export const subscribeToUserPrompts = (
  userId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel(`user_prompts_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_prompts',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe()
}

export default supabase