import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/auth/login?error=${encodeURIComponent(
          errorDescription || error
        )}`,
        request.url
      )
    )
  }

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login?error=No code provided', request.url))
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(
      new URL('/auth/login?error=Configuration error', request.url)
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  try {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(
        new URL(
          `/auth/login?error=${encodeURIComponent(exchangeError.message)}`,
          request.url
        )
      )
    }

    if (data.user) {
      // Check if user profile exists
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!existingProfile) {
        // Create user profile for new OAuth users
        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email,
          profile: {
            fullName: data.user.user_metadata?.full_name || data.user.email,
            createdVia: 'oauth'
          },
          preferences: {
            theme: 'dark',
            defaultIDE: null
          },
          role: 'user',
          is_guest: false
        })
      }
    }

    // Redirect to home page
    return NextResponse.redirect(new URL('/', request.url))
  } catch (error: any) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(
      new URL(
        `/auth/login?error=${encodeURIComponent(error.message || 'Unknown error')}`,
        request.url
      )
    )
  }
}
