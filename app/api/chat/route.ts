import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ChatResponder } from '@/lib/chat-responder'
import { RAGRetriever } from '@/lib/rag-retriever'
import { Logger } from '@/lib/logger'
import { ErrorHandler } from '@/lib/error-handler'
import { withExponentialBackoff } from '@/lib/retry-utils'
import type { ChatMessage } from '@/types/database'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { message, ideId, conversationId, userId, incognito } = await request.json()

    if (!message || !ideId) {
      return NextResponse.json(
        { error: { message: 'Message and IDE ID are required' } },
        { status: 400 }
      )
    }

    // Get IDE details
    const { data: ide, error: ideError } = await supabase
      .from('ides')
      .select('*')
      .eq('id', ideId)
      .single()

    if (ideError || !ide) {
      Logger.error({
        action: 'CHAT_REQUEST_ERROR',
        userId,
        errorMessage: 'IDE not found',
        metadata: { ideId }
      })
      return NextResponse.json(
        { error: { message: 'IDE not found' } },
        { status: 404 }
      )
    }

    // Retrieve relevant context using RAG
    const ragRetriever = new RAGRetriever()
    const retrieval = await withExponentialBackoff(() =>
      ragRetriever.retrieveAndAssemble(message, ideId, {
        topK: 5,
        threshold: 0.7
      })
    )

    // Generate response using ChatResponder
    const chatResponder = new ChatResponder({
      openRouterApiKey: process.env.OPENROUTER_API_KEY,
      openAIApiKey: process.env.OPENAI_API_KEY
    })

    const chatResponse = await withExponentialBackoff(() =>
      chatResponder.generateResponse({
        ideId,
        messages: [{ role: 'user', content: message }],
        context: retrieval.context,
        sources: retrieval.chunks,
        ide
      })
    )

    // Save chat history if conversation exists and not in incognito mode
    if (conversationId && userId && !incognito) {
      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: chatResponse.response,
        timestamp: new Date().toISOString(),
        metadata: {
          model: chatResponse.metadata.model,
          tokensUsed: chatResponse.tokensUsed,
          sources: chatResponse.sources,
          confidence: chatResponse.metadata.confidence
        }
      }

      // Get current conversation
      const { data: conversation } = await supabase
        .from('chat_history')
        .select('messages')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single()

      const currentMessages = (conversation?.messages as ChatMessage[]) || []
      const updatedMessages = [...currentMessages, userMessage, assistantMessage]

      // Update conversation
      await supabase
        .from('chat_history')
        .update({ messages: updatedMessages })
        .eq('id', conversationId)
        .eq('user_id', userId)
    }

    const duration = Date.now() - startTime
    Logger.logAPICall({
      userId,
      endpoint: '/api/chat',
      method: 'POST',
      statusCode: 200,
      responseTimeMs: duration
    })

    return NextResponse.json({
      response: chatResponse.response,
      sources: chatResponse.sources,
      tokensUsed: chatResponse.tokensUsed,
      metadata: chatResponse.metadata
    })
  } catch (error) {
    const result = ErrorHandler.logError(error, {
      endpoint: '/api/chat',
      userId: (request.nextUrl.searchParams.get('userId') || 'unknown')
    })

    return NextResponse.json(
      { error: { message: result.userMessage } },
      { status: result.statusCode }
    )
  }
}
