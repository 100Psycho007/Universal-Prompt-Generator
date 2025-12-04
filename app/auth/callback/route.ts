import { supabase } from '@/lib/supabase-client'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code && supabase) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to home page after successful auth
  return NextResponse.redirect(`${origin}/`)
}
