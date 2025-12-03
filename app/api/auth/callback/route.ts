import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

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
        `/auth/login?error=${encodeURIComponent(errorDescription || error)}`,
        requestUrl.origin
      )
    )
  }

  if (code) {
    try {
      const supabase = createRouteHandlerClient({ cookies })
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        Logger.warn({
          action: 'AUTH_CODE_EXCHANGE_FAILED',
          errorMessage: exchangeError.message
        })

        return NextResponse.redirect(
          new URL(
            `/auth/login?error=${encodeURIComponent(exchangeError.message)}`,
            requestUrl.origin
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
          requestUrl.origin
        )
      )
    }
  }

  // Redirect to home after successful callback
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
