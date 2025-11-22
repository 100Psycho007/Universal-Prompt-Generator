import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Hello from App Router API!',
    timestamp: new Date().toISOString(),
    method: 'GET',
    url: request.url
  })
}