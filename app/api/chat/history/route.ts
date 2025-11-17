import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Logger } from '@/lib/logger'
import { ErrorHandler } from '@/lib/error-handler'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const ideId = searchParams.get('ideId')

    if (!userId) {
      return NextResponse.json(
        { error: { message: 'User ID is required' } },
        { status: 400 }
      )
    }

    let query = supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (ideId) {
      query = query.eq('ide_id', ideId)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    Logger.logAPICall({
      userId,
      endpoint: '/api/chat/history',
      method: 'GET',
      statusCode: 200,
      responseTimeMs: 0
    })

    return NextResponse.json({ conversations: data || [] })
  } catch (error) {
    const result = ErrorHandler.logError(error)

    return NextResponse.json(
      { error: { message: result.userMessage } },
      { status: result.statusCode }
    )
  }
}
