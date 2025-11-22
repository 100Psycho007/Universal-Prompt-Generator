export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('Test API called')
  
  try {
    return NextResponse.json({
      message: 'API is working',
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url
    })
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json(
      { error: 'API error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}