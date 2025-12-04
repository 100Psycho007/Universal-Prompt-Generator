'use client'

import React, { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function UploadDocsPage() {
  const { user, isGuest, isLoading } = useAuth()
  const router = useRouter()
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url' | 'paste'>('file')
  const [files, setFiles] = useState<File[]>([])
  const [url, setUrl] = useState('')
  const [pastedContent, setPastedContent] = useState('')
  const [docName, setDocName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (isLoading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  }

  if (isGuest) {
    router.push('/auth/login')
    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
      setError('')
    }
  }

  const handleUpload = async () => {
    setError('')
    setSuccess('')
    setIsUploading(true)
    setProgress(0)

    try {
      if (!docName.trim()) {
        throw new Error('Please provide a name for your documentation')
      }

      const formData = new FormData()
      formData.append('name', docName)
      formData.append('method', uploadMethod)

      if (uploadMethod === 'file') {
        if (files.length === 0) {
          throw new Error('Please select at least one file')
        }
        files.forEach(file => formData.append('files', file))
      } else if (uploadMethod === 'url') {
        if (!url.trim()) {
          throw new Error('Please provide a URL')
        }
        formData.append('url', url)
      } else if (uploadMethod === 'paste') {
        if (!pastedContent.trim()) {
          throw new Error('Please paste some content')
        }
        formData.append('content', pastedContent)
      }

      const response = await fetch('/api/docs/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      setSuccess(`Successfully uploaded! Created ${result.data.chunkCount} chunks with embeddings.`)
      setProgress(100)
      
      // Reset form
      setTimeout(() => {
        setDocName('')
        setFiles([])
        setUrl('')
        setPastedContent('')
        setProgress(0)
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsUploading(false)
    }
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Upload Custom Documentation</h1>
          <p className="text-gray-400 mb-8">
            Add your own documentation to the database for RAG-powered chat and prompt generation
          </p>

          {/* Doc Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Documentation Name *
            </label>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="e.g., My Custom Framework, Internal API Docs"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Upload Method Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Upload Method
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setUploadMethod('file')}
                className={`p-4 rounded-lg border-2 transition ${
                  uploadMethod === 'file'
                    ? 'border-blue-500 bg-blue-500/20 text-white'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="text-2xl mb-2">📁</div>
                <div className="font-medium">Upload Files</div>
                <div className="text-xs text-gray-400 mt-1">PDF, MD, TXT, HTML</div>
              </button>
              <button
                onClick={() => setUploadMethod('url')}
                className={`p-4 rounded-lg border-2 transition ${
                  uploadMethod === 'url'
                    ? 'border-blue-500 bg-blue-500/20 text-white'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="text-2xl mb-2">🌐</div>
                <div className="font-medium">Crawl URL</div>
                <div className="text-xs text-gray-400 mt-1">Auto-crawl website</div>
              </button>
              <button
                onClick={() => setUploadMethod('paste')}
                className={`p-4 rounded-lg border-2 transition ${
                  uploadMethod === 'paste'
                    ? 'border-blue-500 bg-blue-500/20 text-white'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="text-2xl mb-2">📋</div>
                <div className="font-medium">Paste Text</div>
                <div className="text-xs text-gray-400 mt-1">Direct text input</div>
              </button>
            </div>
          </div>

          {/* Upload Method Content */}
          <div className="mb-6">
            {uploadMethod === 'file' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Files
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.md,.txt,.html,.epub,.docx"
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                {files.length > 0 && (
                  <div className="mt-3 text-sm text-gray-400">
                    Selected: {files.map(f => f.name).join(', ')}
                  </div>
                )}
              </div>
            )}

            {uploadMethod === 'url' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Documentation URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://docs.example.com"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-2 text-sm text-gray-400">
                  We'll automatically crawl and extract documentation from this URL
                </p>
              </div>
            )}

            {uploadMethod === 'paste' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Paste Documentation Content
                </label>
                <textarea
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  placeholder="Paste your documentation here..."
                  rows={12}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Processing...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-200">
              {success}
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition"
          >
            {isUploading ? 'Processing...' : 'Upload & Process Documentation'}
          </button>

          <p className="mt-4 text-sm text-gray-400 text-center">
            Processing includes: chunking, embedding generation, and indexing for semantic search
          </p>
        </div>
      </main>
    </div>
  )
}
