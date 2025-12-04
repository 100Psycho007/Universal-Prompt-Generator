'use client'

import React, { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PRDSection {
  title: string
  content: string
}

export default function PRDGeneratorPage() {
  const { user, isGuest, isLoading } = useAuth()
  const router = useRouter()
  const [idea, setIdea] = useState('')
  const [context, setContext] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [constraints, setConstraints] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [prd, setPRD] = useState<PRDSection[]>([])
  const [error, setError] = useState('')

  if (isLoading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  }

  if (isGuest) {
    router.push('/auth/login')
    return null
  }

  const handleGenerate = async () => {
    if (!idea.trim()) {
      setError('Please describe your product idea')
      return
    }

    setError('')
    setIsGenerating(true)
    setPRD([])

    try {
      const response = await fetch('/api/prd/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea,
          context,
          targetAudience,
          constraints
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate PRD')
      }

      const result = await response.json()
      setPRD(result.data.sections)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadPRD = () => {
    const markdown = prd.map(section => `# ${section.title}\n\n${section.content}\n\n`).join('')
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'product-requirements-document.md'
    a.click()
    URL.revokeObjectURL(url)
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
            <Link href="/" className="text-gray-300 hover:text-white">
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="bg-gray-800 rounded-lg shadow-xl p-8">
            <h1 className="text-3xl font-bold text-white mb-2">PRD Generator</h1>
            <p className="text-gray-400 mb-8">
              Transform your product ideas into comprehensive Product Requirements Documents
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Product Idea *
                </label>
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Describe your product idea in detail..."
                  rows={6}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Context (Optional)
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Market context, competitive landscape, business goals..."
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Audience (Optional)
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., Developers, Enterprise teams, Students"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Constraints (Optional)
                </label>
                <textarea
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder="Budget, timeline, technical constraints..."
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition"
              >
                {isGenerating ? 'Generating PRD...' : 'Generate PRD'}
              </button>
            </div>
          </div>

          {/* Output Panel */}
          <div className="bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Generated PRD</h2>
              {prd.length > 0 && (
                <button
                  onClick={downloadPRD}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Download MD
                </button>
              )}
            </div>

            {isGenerating && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-400">Generating your PRD...</p>
              </div>
            )}

            {!isGenerating && prd.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📄</div>
                <p className="text-gray-400">Your PRD will appear here</p>
              </div>
            )}

            {prd.length > 0 && (
              <div className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-4">
                {prd.map((section, index) => (
                  <div key={index} className="border-b border-gray-700 pb-6 last:border-0">
                    <h3 className="text-xl font-bold text-white mb-3">{section.title}</h3>
                    <div className="text-gray-300 whitespace-pre-wrap">{section.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
