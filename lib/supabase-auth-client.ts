import { supabase, supabaseAdmin } from './supabase-client'
import { User } from '@/types/database'

// Auth types
export interface SignUpCredentials {
  email: string
  password: string
  fullName?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface UserProfile {
  id: string
  email: string
  fullName?: string
  role: 'user' | 'admin'
  isGuest: boolean
  preferences?: {
    theme?: 'light' | 'dark'
    defaultIDE?: string
  }
}

// Sign up with email and password
export const signUp = async (credentials: SignUpCredentials) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          full_name: credentials.fullName || ''
        }
      }
    })

    if (error) {
      return { data: null, error: error.message }
    }

    // Create user profile in users table
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          profile: {
            fullName: credentials.fullName || '',
            createdVia: 'email'
          },
          preferences: {
            theme: 'dark',
            defaultIDE: null
          },
          role: 'user',
          is_guest: false
        })

      if (profileError) {
        console.error('Error creating user profile:', profileError)
      }
    }

    return {
      data: {
        user: data.user,
        session: data.session
      },
      error: null
    }
  } catch (error: any) {
    return { data: null, error: error.message || 'Sign up failed' }
  }
}

// Login with email and password
export const logIn = async (credentials: LoginCredentials) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    })

    if (error) {
      return { data: null, error: error.message }
    }

    return {
      data: {
        user: data.user,
        session: data.session
      },
      error: null
    }
  } catch (error: any) {
    return { data: null, error: error.message || 'Login failed' }
  }
}

// Sign up with Google OAuth
export const signUpWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      }
    })

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message || 'Google sign up failed' }
  }
}

// Reset password
export const resetPassword = async (email: string) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
    })

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (error: any) {
    return { error: error.message || 'Password reset failed' }
  }
}

// Update password
export const updatePassword = async (newPassword: string) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (error: any) {
    return { error: error.message || 'Password update failed' }
  }
}

// Logout
export const logOut = async () => {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (error: any) {
    return { error: error.message || 'Logout failed' }
  }
}

// Get current user with profile
export const getCurrentUserProfile = async (): Promise<{
  profile: UserProfile | null
  error: string | null
}> => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { profile: null, error: authError?.message || 'No user found' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return { profile: null, error: profileError.message }
    }

    return {
      profile: {
        id: profile.id,
        email: profile.email || user.email || '',
        fullName: profile.profile?.fullName || '',
        role: profile.role,
        isGuest: profile.is_guest,
        preferences: profile.preferences
      },
      error: null
    }
  } catch (error: any) {
    return { profile: null, error: error.message || 'Failed to get user profile' }
  }
}

// Get user by ID (admin only)
export const getUserByIdAdmin = async (userId: string) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to get user' }
  }
}

// Get all users (admin only)
export const getAllUsersAdmin = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to get users' }
  }
}

// Update user profile
export const updateUserProfile = async (
  userId: string,
  updates: {
    fullName?: string
    preferences?: any
  }
) => {
  try {
    const { data: existingProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    const updatedProfile = {
      ...existingProfile?.profile,
      fullName: updates.fullName || existingProfile?.profile?.fullName
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        profile: updatedProfile,
        preferences: updates.preferences || existingProfile?.preferences
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to update profile' }
  }
}

// Make user an admin (admin only)
export const makeUserAdminAdmin = async (userId: string) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ role: 'admin' })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to make user admin' }
  }
}

// Remove admin status (admin only)
export const removeAdminStatusAdmin = async (userId: string) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ role: 'user' })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message || 'Failed to remove admin status' }
  }
}

// Check if user is admin
export const isUserAdmin = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (error) {
      return false
    }

    return data?.role === 'admin'
  } catch (error) {
    return false
  }
}

// Create guest session
export const createGuestSession = async () => {
  try {
    // For guest mode, we use anon user without authentication
    return { error: null }
  } catch (error: any) {
    return { error: error.message || 'Failed to create guest session' }
  }
}

// Check if user is guest
export const isUserGuest = async (): Promise<boolean> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return true
    }

    const { data, error: profileError } = await supabase
      .from('users')
      .select('is_guest')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return true
    }

    return data?.is_guest || false
  } catch (error) {
    return true
  }
}
