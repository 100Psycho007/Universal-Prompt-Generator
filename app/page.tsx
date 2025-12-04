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
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
      
      <nav className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-black/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-white flex items-center gap-3 group">
              <span className="text-3xl group-hover:scale-110 transition-transform">🚀</span>
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Universal IDE Platform
              </span>
            </Link>
            <div className="flex items-center gap-3">
              {!isGuest && isAdmin && (
                <Link
                  href="/admin"
                  className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/chat"
                className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
              >
                Chat
              </Link>
              <Link
                href="/upload-docs"
                className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
              >
                Upload
              </Link>
              <Link
                href="/prd-generator"
                className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
              >
                PRD
              </Link>
              {!isGuest && (
                <div className="text-gray-400 text-sm px-3">
                  {userProfile?.fullName || user?.email?.split('@')[0] || 'User'}
                </div>
              )}
              {isGuest ? (
                <div className="flex gap-2">
                  <Link
                    href="/auth/login"
                    className="text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-all backdrop-blur-sm border border-white/10"
                  >
                    Sign Up
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleLogout}
                  className="text-white bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-red-500/20"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="mb-20 text-center">
          <div className="inline-block mb-6">
            <span className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium backdrop-blur-sm">
              ✨ AI-Powered Documentation Platform
            </span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
              Build Smarter with
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
              AI Documentation
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            {isGuest
              ? 'Chat with AI about IDE documentation, upload custom docs, and generate PRDs. Sign up to unlock the full power.'
              : 'Your intelligent companion for documentation, chat, and PRD generation.'}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Link
              href="/upload-docs"
              className="group relative bg-gradient-to-br from-blue-500/10 to-blue-600/5 hover:from-blue-500/20 hover:to-blue-600/10 p-8 rounded-2xl border border-blue-500/20 hover:border-blue-400/40 transition-all duration-300 backdrop-blur-sm hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📁</div>
              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-300 transition-colors">Upload Docs</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Add your own documentation for RAG-powered intelligent chat</p>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-blue-600/0 group-hover:from-blue-500/5 group-hover:to-blue-600/5 transition-all duration-300" />
            </Link>
            
            <Link
              href="/prd-generator"
              className="group relative bg-gradient-to-br from-purple-500/10 to-purple-600/5 hover:from-purple-500/20 hover:to-purple-600/10 p-8 rounded-2xl border border-purple-500/20 hover:border-purple-400/40 transition-all duration-300 backdrop-blur-sm hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">📄</div>
              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">PRD Generator</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Transform ideas into comprehensive product requirement docs</p>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/0 to-purple-600/0 group-hover:from-purple-500/5 group-hover:to-purple-600/5 transition-all duration-300" />
            </Link>
            
            <Link
              href="/chat"
              className="group relative bg-gradient-to-br from-green-500/10 to-green-600/5 hover:from-green-500/20 hover:to-green-600/10 p-8 rounded-2xl border border-green-500/20 hover:border-green-400/40 transition-all duration-300 backdrop-blur-sm hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">💬</div>
              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-green-300 transition-colors">RAG Chat</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Chat with AI about any IDE documentation instantly</p>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500/0 to-green-600/0 group-hover:from-green-500/5 group-hover:to-green-600/5 transition-all duration-300" />
            </Link>
          </div>
          
          {isGuest && (
            <div className="relative bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-400/30 rounded-2xl p-6 backdrop-blur-sm">
              <p className="text-blue-200 text-lg">
                🎉 You're browsing as a guest. <Link href="/auth/signup" className="text-blue-300 hover:text-blue-100 underline font-semibold">Sign up now</Link> to save prompts and unlock all features.
              </p>
            </div>
          )}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="relative group bg-gradient-to-br from-blue-500/5 to-blue-600/5 rounded-2xl p-8 text-center border border-blue-500/10 hover:border-blue-400/30 transition-all backdrop-blur-sm hover:scale-105">
            <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-3">{ides.length}+</div>
            <div className="text-gray-400 text-sm font-medium">AI Coding Agents</div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-blue-600/0 group-hover:from-blue-500/10 group-hover:to-blue-600/5 transition-all duration-300" />
          </div>
          <div className="relative group bg-gradient-to-br from-green-500/5 to-green-600/5 rounded-2xl p-8 text-center border border-green-500/10 hover:border-green-400/30 transition-all backdrop-blur-sm hover:scale-105">
            <div className="text-5xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent mb-3">∞</div>
            <div className="text-gray-400 text-sm font-medium">Custom Docs Supported</div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500/0 to-green-600/0 group-hover:from-green-500/10 group-hover:to-green-600/5 transition-all duration-300" />
          </div>
          <div className="relative group bg-gradient-to-br from-purple-500/5 to-purple-600/5 rounded-2xl p-8 text-center border border-purple-500/10 hover:border-purple-400/30 transition-all backdrop-blur-sm hover:scale-105">
            <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent mb-3">11</div>
            <div className="text-gray-400 text-sm font-medium">PRD Sections Generated</div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/0 to-purple-600/0 group-hover:from-purple-500/10 group-hover:to-purple-600/5 transition-all duration-300" />
          </div>
        </div>

        {/* IDEs Section */}
        <div className="mb-10">
          <h2 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Available AI Coding Agents
          </h2>
          <p className="text-gray-400 text-lg mb-8">Chat with AI about any of these tools and their documentation</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {idesLoading ? (
            <>
              {Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="bg-white/5 rounded-2xl border border-white/10 p-6 animate-pulse backdrop-blur-sm">
                  <div className="h-6 bg-white/10 rounded-lg w-3/4 mb-3"></div>
                  <div className="h-4 bg-white/10 rounded-lg w-1/2 mb-4"></div>
                  <div className="h-4 bg-white/10 rounded-lg w-1/4"></div>
                </div>
              ))}
            </>
          ) : ides.length > 0 ? (
            ides.map((ide) => (
              <div
                key={ide.id}
                className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl border border-white/10 hover:border-blue-400/40 p-6 transition-all duration-300 backdrop-blur-sm hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/10"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">{ide.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                    ide.status === 'active' 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  }`}>
                    {ide.status}
                  </span>
                </div>
                {ide.docs_url && (
                  <a
                    href={ide.docs_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm mb-4 block transition-colors inline-flex items-center gap-1"
                  >
                    📚 Documentation →
                  </a>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => router.push(`/chat?ideId=${ide.id}`)}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-500/20"
                  >
                    💬 Chat
                  </button>
                  <button
                    onClick={() => router.push(`/ide/${ide.id}`)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all border border-white/10 hover:border-white/20"
                  >
                    📊 Details
                  </button>
                </div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300 pointer-events-none" />
              </div>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-400 py-20">
              <div className="text-7xl mb-6 opacity-50">📚</div>
              <p className="text-xl">No IDEs available yet. Upload your first custom documentation to get started!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
