'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase-client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { UserProfile } from './supabase-auth-client'

interface AuthContextType {
  user: SupabaseUser | null
  userProfile: UserProfile | null
  isLoading: boolean
  isGuest: boolean
  isAdmin: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const refreshUser = async () => {
    try {
      if (!supabase) {
        setIsLoading(false)
        return
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        setUser(null)
        setUserProfile(null)
        setIsGuest(true)
        setIsAdmin(false)
        return
      }

      setUser(user)
      setIsGuest(false)

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileError && profile) {
        setUserProfile({
          id: profile.id,
          email: profile.email || user.email || '',
          fullName: profile.profile?.fullName || '',
          role: profile.role,
          isGuest: profile.is_guest,
          preferences: profile.preferences
        })
        setIsAdmin(profile.role === 'admin')
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()

    if (!supabase) {
      return
    }

    const {
      data: { subscription }
    } = supabase!.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        setIsGuest(false)
        
        const { data: profile } = await supabase!
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profile) {
          setUserProfile({
            id: profile.id,
            email: profile.email || session.user.email || '',
            fullName: profile.profile?.fullName || '',
            role: profile.role,
            isGuest: profile.is_guest,
            preferences: profile.preferences
          })
          setIsAdmin(profile.role === 'admin')
        }
      } else {
        setUser(null)
        setUserProfile(null)
        setIsGuest(true)
        setIsAdmin(false)
      }
      setIsLoading(false)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isLoading,
        isGuest,
        isAdmin,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
