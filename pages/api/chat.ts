import { NextApiRequest, NextApiResponse } from 'next'
import { supabase, getCurrentUser, createChatHistory, updateChatHistory } from '../../lib/supabase-client'
import { defaultRAGRetriever } from '../../lib/rag-retriever'
import { defaultChatResponder } from '../../lib/chat-responder'
import { ChatMessage } from '../../types/database'

interface ChatRequest {
  ide_id: string
  messages: ChatMessage[]
  chat_id?: string // Optional for continuing existing conversations
  options?: {
    top_k?: number
    threshold?: number
    max_tokens?: number
    temperature?: number
  }
}

interface ChatAPIResponse {
  response: string
  sources: Array<{
    url: string | null
    text: string
    section: string | null
    similarity: number
  }>
  tokens_used: {
    prompt: number
    completion: number
    total: number
  }
  metadata: {
    model: string
    response_time: number
    confidence: 'high' | 'medium' | 'low'
    chat_id?: string
  }
}

// Rate limiting: 10 messages per user per minute
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(userId)
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60000 }) // 1 minute
    return true
  }
  
  if (userLimit.count >= 10) {
    return false
  }
  
  userLimit.count++
  return true
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatAPIResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get current user
    const { user: authUser, error: authError } = await getCurrentUser()
    
    if (authError || !authUser) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Check rate limit
    if (!checkRateLimit(authUser.id)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait before sending another message.' })
    }

    const { ide_id, messages, chat_id, options }: ChatRequest = req.body

    // Validate request
    if (!ide_id || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid request: ide_id and messages are required' })
    }

    // Validate message format
    const isValidMessage = (msg: any): msg is ChatMessage => {
      return msg && 
             typeof msg.role === 'string' && 
             ['user', 'assistant', 'system'].includes(msg.role) &&
             typeof msg.content === 'string'
    }

    if (!messages.every(isValidMessage)) {
      return res.status(400).json({ error: 'Invalid message format' })
    }

    // Verify IDE exists and is active
    const { data: ide, error: ideError } = await supabase
      .from('ides')
      .select('*')
      .eq('id', ide_id)
      .eq('status', 'active')
      .single()

    if (ideError || !ide) {
      return res.status(404).json({ error: 'IDE not found or inactive' })
    }

    // Get or create chat history
    let chatHistoryId = chat_id
    let existingMessages: ChatMessage[] = []

    if (chat_id) {
      // Load existing chat history
      const { data: existingChat, error: chatError } = await supabase
        .from('chat_history')
        .select('messages')
        .eq('id', chat_id)
        .eq('user_id', authUser.id)
        .single()

      if (chatError || !existingChat) {
        return res.status(404).json({ error: 'Chat session not found' })
      }

      existingMessages = existingChat.messages || []
    }

    // Combine existing messages with new messages
    const allMessages = [...existingMessages, ...messages]

    // Get the latest user message for RAG retrieval
    const latestUserMessage = messages
      .filter(msg => msg.role === 'user')
      .pop()

    if (!latestUserMessage) {
      return res.status(400).json({ error: 'No user message found' })
    }

    // Perform RAG retrieval
    let retrievalResult
    try {
      retrievalResult = await defaultRAGRetriever.retrieveAndAssemble(
        latestUserMessage.content,
        ide_id,
        {
          topK: options?.top_k,
          threshold: options?.threshold
        }
      )
    } catch (error) {
      console.error('RAG retrieval failed:', error)
      // Continue without context if retrieval fails
      retrievalResult = {
        query: latestUserMessage.content,
        chunks: [],
        context: 'No relevant documentation found.',
        ide,
        metadata: {
          totalChunks: 0,
          averageSimilarity: 0,
          retrievalTime: 0,
          contextLength: 0
        }
      }
    }

    // Generate response using chat responder
    const chatResponse = await defaultChatResponder.generateResponse({
      ideId: ide_id,
      messages: allMessages,
      context: retrievalResult.context,
      sources: retrievalResult.chunks,
      ide: retrievalResult.ide
    })

    // Update chat history
    const updatedMessages = [...allMessages, {
      role: 'assistant' as const,
      content: chatResponse.response,
      timestamp: new Date().toISOString(),
      metadata: {
        sources: chatResponse.sources,
        tokens_used: chatResponse.tokensUsed,
        retrieval_metadata: retrievalResult.metadata
      }
    }]

    if (chatHistoryId) {
      // Update existing chat
      await updateChatHistory(chatHistoryId, updatedMessages)
    } else {
      // Create new chat
      const { data: newChat, error: createError } = await createChatHistory({
        user_id: authUser.id,
        ide_id: ide_id,
        messages: updatedMessages
      })

      if (createError || !newChat) {
        console.error('Failed to create chat history:', createError)
      } else {
        chatHistoryId = newChat.id
      }
    }

    // Return response
    const response: ChatAPIResponse = {
      response: chatResponse.response,
      sources: chatResponse.sources,
      tokens_used: chatResponse.tokensUsed,
      metadata: {
        model: chatResponse.metadata.model,
        response_time: chatResponse.metadata.responseTime,
        confidence: chatResponse.metadata.confidence,
        chat_id: chatHistoryId
      }
    }

    res.status(200).json(response)

  } catch (error) {
    console.error('Chat API error:', error)
    res.status(500).json({ 
      error: 'An error occurred while processing your request. Please try again.' 
    })
  }
}

// Clean up rate limit map periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  const userIdsToDelete: string[] = []
  
  rateLimitMap.forEach((limit, userId) => {
    if (now > limit.resetTime) {
      userIdsToDelete.push(userId)
    }
  })
  
  userIdsToDelete.forEach(userId => {
    rateLimitMap.delete(userId)
  })
}, 5 * 60 * 1000)