import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Check Supabase connection
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('ides')
      .select('count', { count: 'exact', head: true })

    if (error) {
      return NextResponse.json(
        {
          status: 'degraded',
          message: 'Database connection issue',
          error: error.message,
          responseTimeMs: Date.now() - startTime
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        api: 'ok'
      },
      responseTimeMs: Date.now() - startTime
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTimeMs: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}
