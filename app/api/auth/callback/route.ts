import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Logger } from '@/lib/logger'
import { ErrorHandler } from '@/lib/error-handler'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    Logger.warn({
      action: 'AUTH_CALLBACK_ERROR',
      errorMessage: error,
      metadata: {
        errorDescription
      }
    })

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
    Logger.warn({
      action: 'AUTH_CALLBACK_NO_CODE',
      errorMessage: 'OAuth code not provided'
    })

    return NextResponse.redirect(new URL('/auth/login?error=No code provided', request.url))
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    Logger.error({
      action: 'AUTH_CALLBACK_CONFIG_ERROR',
      errorMessage: 'Supabase environment variables not configured'
    })

    return NextResponse.redirect(
      new URL('/auth/login?error=Configuration error', request.url)
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  try {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      Logger.warn({
        action: 'AUTH_CODE_EXCHANGE_FAILED',
        errorMessage: exchangeError.message
      })

      return NextResponse.redirect(
        new URL(
          `/auth/login?error=${encodeURIComponent(exchangeError.message)}`,
          request.url
        )
      )
    }

    if (data.user) {
      try {
        // Check if user profile exists
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .single()

        if (profileCheckError && profileCheckError.code !== 'PGRST116') {
          Logger.warn({
            action: 'AUTH_PROFILE_CHECK_ERROR',
            errorMessage: profileCheckError.message,
            userId: data.user.id
          })
        }

        if (!existingProfile) {
          // Create user profile for new OAuth users
          const { error: insertError } = await supabase.from('users').insert({
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

          if (insertError) {
            Logger.warn({
              action: 'AUTH_PROFILE_INSERT_ERROR',
              errorMessage: insertError.message,
              userId: data.user.id
            })
          } else {
            Logger.info({
              action: 'AUTH_NEW_USER_CREATED',
              userId: data.user.id,
              metadata: {
                email: data.user.email,
                provider: 'oauth'
              }
            })
          }
        }
      } catch (profileError) {
        Logger.error({
          action: 'AUTH_PROFILE_SYNC_ERROR',
          errorMessage: profileError instanceof Error ? profileError.message : String(profileError),
          userId: data.user.id
        })
      }

      Logger.info({
        action: 'AUTH_CALLBACK_SUCCESS',
        userId: data.user.id,
        metadata: {
          email: data.user.email,
          provider: 'oauth'
        }
      })
    }

    // Redirect to home page
    return NextResponse.redirect(new URL('/', request.url))
  } catch (error: any) {
    Logger.error({
      action: 'AUTH_CALLBACK_EXCEPTION',
      errorMessage: error?.message || 'Unknown error',
      metadata: {
        code: error?.code,
        status: error?.status
      }
    })

    return NextResponse.redirect(
      new URL(
        `/auth/login?error=${encodeURIComponent(error?.message || 'Unknown error')}`,
        request.url
      )
    )
  }
}
