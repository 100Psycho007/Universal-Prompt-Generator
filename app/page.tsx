'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { logOut } from '@/lib/supabase-auth-client'
import { getIDEs } from '@/lib/supabase-client'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function Home() {
  const router = useRouter()
  const { user, userProfile, isLoading, isAdmin, isGuest } = useAuth()
  const [ides, setIDEs] = React.useState<any[]>([])
  const [idesLoading, setIDEsLoading] = React.useState(true)

  useEffect(() => {
    fetchIDEs()
  }, [])

  const fetchIDEs = async () => {
    const { data, error } = await getIDEs()
    if (!error && data) {
      setIDEs(data)
    }
    setIDEsLoading(false)
  }

  const handleLogout = async () => {
    const { error } = await logOut()
    if (!error) {
      router.push('/auth/login')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-white">
              Universal IDE Database
            </Link>
            <div className="flex items-center gap-4">
              {!isGuest && isAdmin && (
                <Link
                  href="/admin"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Admin Panel
                </Link>
              )}
              {!isGuest && (
                <div className="text-gray-300">
                  Welcome, {userProfile?.fullName || userProfile?.email}!
                </div>
              )}
              {isGuest ? (
                <div className="flex gap-2">
                  <Link
                    href="/auth/login"
                    className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="text-white bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign Up
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleLogout}
                  className="text-white bg-red-600 hover:bg-red-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Welcome to Universal IDE Database</h1>
          <p className="text-gray-400 text-lg mb-4">
            {isGuest
              ? 'Explore IDEs and their documentation. Sign up to save your work and access advanced features.'
              : 'Explore IDEs, generate prompts, and manage your preferences.'}
          </p>
          {isGuest && (
            <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 mb-6">
              <p className="text-blue-200">
                You are browsing as a guest. <Link href="/auth/signup" className="text-blue-300 hover:text-blue-200 underline">Sign up to save prompts and access full features.</Link>
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {idesLoading ? (
            <div className="col-span-full text-center text-gray-400">Loading IDEs...</div>
          ) : ides.length > 0 ? (
            ides.map((ide) => (
              <div
                key={ide.id}
                className="bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition"
              >
                <h3 className="text-xl font-bold text-white mb-2">{ide.name}</h3>
                {ide.docs_url && (
                  <a
                    href={ide.docs_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm mb-4 block"
                  >
                    View Documentation →
                  </a>
                )}
                <p className="text-gray-400 text-sm">Status: {ide.status}</p>
                {!isGuest && (
                  <button
                    onClick={() => router.push(`/ide/${ide.id}`)}
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium"
                  >
                    View Details
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-400">No IDEs available</div>
          )}
        </div>
      </main>
    </div>
  )
}
