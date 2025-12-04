'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { logOut } from '@/lib/supabase-auth-client'
import { getIDEs } from '@/lib/supabase-client'
import Link from 'next/link'
import { IDEGridSkeleton } from '@/components/LoadingSkeleton'

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
    try {
      const { data, error } = await getIDEs()
      if (!error && data) {
        setIDEs(data)
      }
    } catch (error) {
      console.error('Failed to load IDEs:', error)
    } finally {
      setIDEsLoading(false)
    }
  }

  const handleLogout = async () => {
    const { error } = await logOut()
    if (!error) {
      router.push('/auth/login')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <nav className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold text-white">Universal IDE Database</div>
              <div className="flex gap-2">
                <div className="h-10 w-20 bg-gray-700 rounded animate-pulse"></div>
                <div className="h-10 w-20 bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-12">
            <div className="h-10 bg-gray-800 rounded w-2/3 mb-4 animate-pulse"></div>
            <div className="h-6 bg-gray-800 rounded w-1/2 mb-4 animate-pulse"></div>
          </div>
          <IDEGridSkeleton />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-3xl">🚀</span>
              Universal IDE Platform
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
              <Link
                href="/chat"
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Chat
              </Link>
              <Link
                href="/upload-docs"
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Upload Docs
              </Link>
              <Link
                href="/prd-generator"
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                PRD Generator
              </Link>
              {!isGuest && (
                <div className="text-gray-300">
                  Welcome, {userProfile?.fullName || user?.email || 'User'}!
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
          <h1 className="text-4xl font-bold text-white mb-4">AI-Powered Documentation Platform</h1>
          <p className="text-gray-400 text-lg mb-4">
            {isGuest
              ? 'Chat with AI about IDE documentation, upload custom docs, and generate PRDs. Sign up to get started.'
              : 'Chat with AI, upload custom documentation, and generate comprehensive PRDs.'}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Link
              href="/upload-docs"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 p-6 rounded-lg shadow-lg transition"
            >
              <div className="text-3xl mb-2">📁</div>
              <h3 className="text-xl font-bold text-white mb-2">Upload Custom Docs</h3>
              <p className="text-blue-100 text-sm">Add your own documentation for RAG-powered chat</p>
            </Link>
            
            <Link
              href="/prd-generator"
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 p-6 rounded-lg shadow-lg transition"
            >
              <div className="text-3xl mb-2">📄</div>
              <h3 className="text-xl font-bold text-white mb-2">PRD Generator</h3>
              <p className="text-purple-100 text-sm">Transform ideas into comprehensive PRDs</p>
            </Link>
            
            <Link
              href="/chat"
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 p-6 rounded-lg shadow-lg transition"
            >
              <div className="text-3xl mb-2">💬</div>
              <h3 className="text-xl font-bold text-white mb-2">RAG Chat</h3>
              <p className="text-green-100 text-sm">Chat with AI about any IDE documentation</p>
            </Link>
          </div>
          {isGuest && (
            <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 mb-6">
              <p className="text-blue-200">
                You are browsing as a guest. <Link href="/auth/signup" className="text-blue-300 hover:text-blue-200 underline">Sign up to save prompts and access full features.</Link>
              </p>
            </div>
          )}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">{ides.length}+</div>
            <div className="text-gray-400">AI Coding Agents</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-4xl font-bold text-green-400 mb-2">∞</div>
            <div className="text-gray-400">Custom Docs Supported</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <div className="text-4xl font-bold text-purple-400 mb-2">11</div>
            <div className="text-gray-400">PRD Sections Generated</div>
          </div>
        </div>

        {/* IDEs Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Available AI Coding Agents</h2>
          <p className="text-gray-400 mb-6">Chat with AI about any of these tools and their documentation</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {idesLoading ? (
            <>
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg shadow-lg p-6 animate-pulse">
                  <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/4"></div>
                </div>
              ))}
            </>
          ) : ides.length > 0 ? (
            ides.map((ide) => (
              <div
                key={ide.id}
                className="bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition border border-gray-700 hover:border-blue-500"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-white">{ide.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    ide.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {ide.status}
                  </span>
                </div>
                {ide.docs_url && (
                  <a
                    href={ide.docs_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm mb-4 block"
                  >
                    📚 View Documentation →
                  </a>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => router.push(`/chat?ideId=${ide.id}`)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition"
                  >
                    💬 Chat
                  </button>
                  <button
                    onClick={() => router.push(`/ide/${ide.id}`)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm font-medium transition"
                  >
                    📊 Details
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-400 py-12">
              <div className="text-6xl mb-4">📚</div>
              <p>No IDEs available yet. Upload your first custom documentation to get started!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
