// Database types for Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// IDE types
export interface IDE {
  id: string
  name: string
  docs_url: string | null
  status: string
  manifest: Json | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface DocChunk {
  id: string
  ide_id: string
  text: string
  embedding: number[] | null
  source_url: string | null
  section: string | null
  version: string
  created_at: string
}

// User types
export interface User {
  id: string
  email: string | null
  profile: Json
  preferences: Json
  role: string
  is_guest: boolean
  created_at: string
}

export interface UserPrompt {
  id: string
  user_id: string
  ide_id: string
  task_description: string
  raw_input: string
  generated_prompt: string
  created_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  metadata?: Json
}

export interface ChatHistory {
  id: string
  user_id: string
  ide_id: string
  messages: ChatMessage[]
  created_at: string
  updated_at: string
}

export interface AdminLog {
  id: string
  action: string
  ide_id: string | null
  metadata: Json
  timestamp: string
}

export interface IngestStatus {
  id: string
  ide_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  chunks_processed: number
  created_at: string
  updated_at: string
}

export interface APIUsageStat {
  id: string
  user_id: string | null
  endpoint: string
  method: string
  status_code: number
  response_time_ms: number
  created_at: string
}

// Database tables union type
export type DatabaseTable = 
  | 'ides'
  | 'doc_chunks'
  | 'users'
  | 'user_prompts'
  | 'chat_history'
  | 'admin_logs'
  | 'ingest_status'
  | 'api_usage_stats'

// Insert types (for creating new records)
export interface IDEInsert {
  name: string
  docs_url?: string | null
  status?: string
  manifest?: Json | null
  created_by?: string | null
  updated_by?: string | null
}

export interface DocChunkInsert {
  ide_id: string
  text: string
  embedding?: number[] | null
  source_url?: string | null
  section?: string | null
  version?: string
}

export interface UserInsert {
  id: string
  email?: string | null
  profile?: Json
  preferences?: Json
  role?: string
  is_guest?: boolean
}

export interface UserPromptInsert {
  user_id: string
  ide_id: string
  task_description: string
  raw_input: string
  generated_prompt: string
}

export interface ChatHistoryInsert {
  user_id: string
  ide_id: string
  messages: ChatMessage[]
}

export interface AdminLogInsert {
  action: string
  ide_id?: string | null
  metadata?: Json
}

// Update types (for updating existing records)
export interface IDEUpdate {
  name?: string
  docs_url?: string | null
  status?: string
  manifest?: Json | null
  created_by?: string | null
  updated_by?: string | null
  doc_count?: number
  last_ingested_at?: string | null
}

export interface DocChunkUpdate {
  ide_id?: string
  text?: string
  embedding?: number[] | null
  source_url?: string | null
  section?: string | null
  version?: string
}

export interface UserUpdate {
  email?: string | null
  profile?: Json
  preferences?: Json
  role?: string
  is_guest?: boolean
}

export interface UserPromptUpdate {
  ide_id?: string
  task_description?: string
  raw_input?: string
  generated_prompt?: string
}

export interface ChatHistoryUpdate {
  ide_id?: string
  messages: ChatMessage[]
}

export interface AdminLogUpdate {
  action?: string
  ide_id?: string | null
  metadata?: Json
}

// Supabase row types
export type DatabaseRow = {
  ides: IDE
  doc_chunks: DocChunk
  users: User
  user_prompts: UserPrompt
  chat_history: ChatHistory
  admin_logs: AdminLog
  ingest_status: IngestStatus
  api_usage_stats: APIUsageStat
}

export type DatabaseInsert = {
  ides: IDEInsert
  doc_chunks: DocChunkInsert
  users: UserInsert
  user_prompts: UserPromptInsert
  chat_history: ChatHistoryInsert
  admin_logs: AdminLogInsert
  ingest_status: IngestStatus
  api_usage_stats: APIUsageStat
}

export type DatabaseUpdate = {
  ides: IDEUpdate
  doc_chunks: DocChunkUpdate
  users: UserUpdate
  user_prompts: UserPromptUpdate
  chat_history: ChatHistoryUpdate
  admin_logs: AdminLogUpdate
  ingest_status: IngestStatus
  api_usage_stats: APIUsageStat
}

// Utility types for common operations
export type IDEWithDocChunks = IDE & {
  doc_chunks?: DocChunk[]
}

export type UserWithPrompts = User & {
  user_prompts?: UserPrompt[]
  chat_history?: ChatHistory[]
}

export type ChatHistoryWithIDE = ChatHistory & {
  ide?: IDE
}

export type UserPromptWithIDE = UserPrompt & {
  ide?: IDE
}

// Vector search types
export interface VectorSearchResult {
  id: string
  ide_id: string
  text: string
  source_url: string | null
  section: string | null
  similarity: number
  ide?: IDE
}

export interface VectorSearchParams {
  query_embedding: number[]
  ide_id?: string
  limit?: number
  threshold?: number
}

// API response types
export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
  hasMore: boolean
}

export interface APIResponse<T> {
  data: T
  error?: string
  message?: string
}

// Export all types as a namespace for easier importing
export namespace Database {
  export type Table = DatabaseTable
  export type Row = DatabaseRow
  export type Insert = DatabaseInsert
  export type Update = DatabaseUpdate
}