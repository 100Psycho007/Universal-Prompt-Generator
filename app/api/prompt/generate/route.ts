import { NextRequest, NextResponse } from 'next/server'
import { Logger } from '@/lib/logger'
import { ErrorHandler, ERROR_CODES } from '@/lib/error-handler'
import { withExponentialBackoff } from '@/lib/retry-utils'
import { supabase, supabaseAdmin } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let userId: string | null = null

  try {
    // Parse request
    const body = await request.json()
    const { taskDescription, ideId } = body

    if (!taskDescription || !ideId) {
      throw ErrorHandler.createError(
        ERROR_CODES.VALIDATION_ERROR,
        'taskDescription and ideId are required',
        400
      )
    }

    // Check Supabase connection
    if (!supabase) {
      throw ErrorHandler.createError(
        ERROR_CODES.INTERNAL_ERROR,
        'Service temporarily unavailable',
        503
      )
    }

    // Get user session
    const {
      data: { session }
    } = await supabase.auth.getSession()
    userId = session?.user?.id || null

    if (!userId && !process.env.NODE_ENV?.includes('development')) {
      throw ErrorHandler.createError(
        ERROR_CODES.UNAUTHORIZED,
        'Please log in to generate prompts',
        401
      )
    }

    // Fetch IDE info with retry
    const ide = await withExponentialBackoff(
      async () => {
        if (!supabase) throw new Error('Supabase not initialized')
        const { data, error } = await supabase
          .from('ides')
          .select('*')
          .eq('id', ideId)
          .single()

        if (error) throw error
        if (!data) throw new Error('IDE not found')
        return data
      },
      3,
      500
    )

    // Fetch vector search results with retry
    const relevantDocs = await withExponentialBackoff(
      async () => {
        if (!supabase) throw new Error('Supabase not initialized')
        const { data, error } = await supabase
          .from('doc_chunks')
          .select('id, text, source_url')
          .eq('ide_id', ideId)
          .textSearch('text', taskDescription)
          .limit(5)

        if (error) {
          Logger.logVectorSearch({
            userId,
            ideId,
            duration: Date.now() - startTime,
            resultCount: 0,
            success: false,
            error: error.message
          })
          return []
        }

        Logger.logVectorSearch({
          userId,
          ideId,
          duration: Date.now() - startTime,
          resultCount: data?.length || 0,
          success: true
        })

        return data || []
      },
      2,
      500
    )

    // Build context from docs
    const context = relevantDocs
      .map((doc) => `Source: ${doc.source_url}\n${doc.text}`)
      .join('\n\n---\n\n')

    // Generate prompt with template
    const generatedPrompt = `
You are an expert ${ide.name} developer.

Task: ${taskDescription}

Relevant Documentation:
${context || 'No documentation available'}

Please provide a detailed response that:
1. Explains how to accomplish this task in ${ide.name}
2. Provides code examples if applicable
3. Includes links to official documentation
4. Mentions any important caveats or best practices
    `.trim()

    const duration = Date.now() - startTime

    // Log the successful call
    await Logger.logAPICall({
      userId,
      endpoint: '/api/prompt/generate',
      method: 'POST',
      statusCode: 200,
      responseTimeMs: duration,
      metadata: {
        ideId,
        docCount: relevantDocs.length,
        taskLength: taskDescription.length
      }
    })

    // Check if response time is within target
    if (duration > 2000) {
      Logger.warn({
        action: 'PERFORMANCE_DEGRADATION',
        duration,
        metadata: {
          endpoint: '/api/prompt/generate',
          targetTime: 2000,
          exceeded: duration - 2000
        }
      })
    }

    return NextResponse.json({
      success: true,
      prompt: generatedPrompt,
      sources: relevantDocs.map((doc) => ({
        url: doc.source_url,
        text: doc.text.substring(0, 200)
      })),
      metadata: {
        ideId,
        responseTimeMs: duration,
        docCount: relevantDocs.length
      }
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const { statusCode, userMessage } = ErrorHandler.logError(error, {
      endpoint: '/api/prompt/generate',
      userId,
      duration
    })

    await Logger.logAPICall({
      userId,
      endpoint: '/api/prompt/generate',
      method: 'POST',
      statusCode,
      responseTimeMs: duration
    })

    return NextResponse.json(
      {
        error: {
          message: userMessage,
          code: error instanceof Error ? 'UNKNOWN' : 'ERROR'
        }
      },
      { status: statusCode }
    )
  }
}
