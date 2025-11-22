'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resetPassword, updatePassword } from '@/lib/supabase-auth-client'
import { supabase } from '@/lib/supabase-client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'request' | 'reset'>('request')

  useEffect(() => {
    if (searchParams) {
      const type = searchParams.get('type')
      if (type === 'recovery') {
        setMode('reset')
        checkAuthState()
      }
    }
  }, [searchParams])

  const checkAuthState = async () => {
    if (!supabase) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMode('request')
    }
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!email) {
      setError('Please enter your email')
      setLoading(false)
      return
    }

    const { error: resetError } = await resetPassword(email)

    if (resetError) {
      setError(resetError)
      setLoading(false)
      return
    }

    setSuccess('Check your email for password reset instructions')
    setEmail('')
    setLoading(false)

    setTimeout(() => {
      router.push('/auth/login')
    }, 3000)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    const { error: updateError } = await updatePassword(newPassword)

    if (updateError) {
      setError(updateError)
      setLoading(false)
      return
    }

    setSuccess('Password updated successfully! Redirecting to login...')
    setNewPassword('')
    setConfirmPassword('')

    setTimeout(() => {
      router.push('/auth/login')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-gray-400 mb-8">
            {mode === 'request'
              ? 'Enter your email to receive reset instructions'
              : 'Enter your new password'}
          </p>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded mb-6">
              {success}
            </div>
          )}

          {mode === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded px-4 py-2 focus:outline-none focus:border-blue-500"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 rounded transition mt-6"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded px-4 py-2 focus:outline-none focus:border-blue-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded px-4 py-2 focus:outline-none focus:border-blue-500"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 rounded transition mt-6"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

          <p className="text-center text-gray-400 text-sm mt-6">
            Remember your password?{' '}
            <a href="/auth/login" className="text-blue-400 hover:text-blue-300">
              Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
