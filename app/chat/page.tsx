'use client'

export const dynamic = 'force-dynamic'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  useAuth
} from '@/lib/auth-context'
import { getIDEs, supabase } from '@/lib/supabase-client'
import Link from 'next/link'
import { ChatMessage, type Message } from '@/components/ChatMessage'
import { ManifestViewer } from '@/components/ManifestViewer'
import type { IDE, ChatHistory } from '@/types/database'
import type { IDEManifest } from '@/lib/manifest-builder'

export default function ChatPage() {
  const router = useRouter()
  const { user, userProfile, isLoading, isGuest } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // State
  const [selectedIDE, setSelectedIDE] = useState<IDE | null>(null)
  const [ides, setIDEs] = useState<IDE[]>([])
  const [idesLoading, setIDEsLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isResponseLoading, setIsResponseLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversationHistory, setConversationHistory] = useState<ChatHistory | null>(null)
  const [showManifest, setShowManifest] = useState(false)
  const [manifest, setManifest] = useState<IDEManifest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [incognitoMode, setIncognitoMode] = useState(false)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load IDEs
  useEffect(() => {
    const loadIDEs = async () => {
      try {
        const { data, error } = await getIDEs()
        if (!error && data) {
          setIDEs(data)

          // Check URL for ideId parameter
          const urlParams = new URLSearchParams(window.location.search)
          const ideIdFromUrl = urlParams.get('ideId')
          
          if (ideIdFromUrl) {
            // Find IDE by ID from URL
            const ideFromUrl = data.find(ide => ide.id === ideIdFromUrl)
            if (ideFromUrl) {
              setSelectedIDE(ideFromUrl)
              if (ideFromUrl.manifest && typeof ideFromUrl.manifest === 'object' && !Array.isArray(ideFromUrl.manifest)) {
                setManifest(ideFromUrl.manifest as unknown as IDEManifest)
              }
              return
            }
          }

          // Select first IDE by default if no URL param
          if (data.length > 0) {
            setSelectedIDE(data[0])
            if (data[0].manifest && typeof data[0].manifest === 'object' && !Array.isArray(data[0].manifest)) {
              setManifest(data[0].manifest as unknown as IDEManifest)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load IDEs:', err)
      } finally {
        setIDEsLoading(false)
      }
    }

    loadIDEs()
  }, [])

  // Load or create conversation
  useEffect(() => {
    if (!user || isGuest || !selectedIDE || !supabase || incognitoMode) return

    const loadConversation = async () => {
      try {
        // Try to get existing conversation or create new one
        const { data: existing } = await supabase!
          .from('chat_history')
          .select('*')
          .eq('user_id', user.id)
          .eq('ide_id', selectedIDE.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (existing) {
          setConversationId(existing.id)
          setConversationHistory(existing)
          setMessages(
            (existing.messages || []).map((msg: any, index: number) => ({
              ...msg,
              id: `${existing.id}-${index}`
            }))
          )
        } else {
          // Create new conversation
          const { data: newConversation, error } = await supabase!
            .from('chat_history')
            .insert({
              user_id: user.id,
              ide_id: selectedIDE.id,
              messages: []
            })
            .select()
            .single()

          if (!error && newConversation) {
            setConversationId(newConversation.id)
            setConversationHistory(newConversation)
            setMessages([])
          }
        }
      } catch (err) {
        console.error('Failed to load conversation:', err)
      }
    }

    loadConversation()
  }, [user, selectedIDE, isGuest, incognitoMode])

  // Handle IDE selection
  const handleIDEChange = (ide: IDE) => {
    setSelectedIDE(ide)
    setMessages([])
    setConversationId(null)
    if (ide.manifest && typeof ide.manifest === 'object' && !Array.isArray(ide.manifest)) {
      setManifest(ide.manifest as unknown as IDEManifest)
    }
  }

  // Send message
  const handleSendMessage = useCallback(async (messageText?: string) => {
    const text = messageText || inputValue.trim()
    if (!text || !selectedIDE || isResponseLoading) return

    if (isGuest) {
      setError('Please sign in to use chat features')
      return
    }

    setError(null)
    setInputValue('')

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])

    // Add loading message
    const loadingMessage: Message = {
      role: 'assistant',
      content: '',
      isLoading: true
    }
    setMessages(prev => [...prev, loadingMessage])

    setIsResponseLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          ideId: selectedIDE.id,
          conversationId: incognitoMode ? null : conversationId,
          userId: user?.id,
          incognito: incognitoMode
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to get response')
      }

      const data = await response.json()

      // Replace loading message with actual response
      setMessages(prev => {
        const updated = [...prev]
        const lastIndex = updated.length - 1
        updated[lastIndex] = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
          metadata: {
            model: data.metadata?.model,
            tokensUsed: data.tokensUsed,
            sources: data.sources,
            confidence: data.metadata?.confidence
          }
        }
        return updated
      })
    } catch (err) {
      // Remove loading message and show error
      setMessages(prev => prev.slice(0, -1))
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsResponseLoading(false)
    }
  }, [inputValue, selectedIDE, conversationId, user, isGuest, isResponseLoading])

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Clear chat history
  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear this conversation?')) return
    
    if (incognitoMode) {
      setMessages([])
      return
    }

    if (!supabase) return

    try {
      if (conversationId) {
        await supabase!
          .from('chat_history')
          .update({ messages: [] })
          .eq('id', conversationId)
      }
      setMessages([])
    } catch (err) {
      setError('Failed to clear history')
    }
  }

  // Toggle incognito mode
  const handleToggleIncognito = () => {
    if (!incognitoMode && messages.length > 0) {
      if (!confirm('Switching to incognito mode will clear current messages. Continue?')) {
        return
      }
    }
    setIncognitoMode(!incognitoMode)
    setMessages([])
    setConversationId(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (isGuest) {
    return (
      <div className="min-h-screen bg-gray-900">
        <nav className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="text-xl font-bold text-white">
                Universal IDE Database
              </Link>
              <div className="flex gap-2">
                <Link href="/auth/login" className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium" >
                  Sign In
                </Link>
                <Link href="/auth/signup" className="text-white bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium" >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>

        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Sign in to use Chat</h2>
            <p className="text-blue-200 mb-4">
              Create an account or sign in to start chatting with our AI assistant about IDE documentation.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
              >
                Sign Up
              </Link>
              <Link
                href="/auth/login"
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium"
              >
                Sign In
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
      
      {/* Navigation */}
      <nav className="relative z-10 glass-dark border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-xl font-bold text-white flex items-center gap-3 group">
              <span className="text-2xl group-hover:scale-110 transition-transform">🚀</span>
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Universal IDE Platform
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5" >
                Home
              </Link>
              <Link href="/profile" className="text-gray-400 hover:text-white text-sm px-3 py-2 glass rounded-lg hover:bg-white/5 transition-all">
                {userProfile?.fullName || userProfile?.email || 'User'}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 glass-dark border-r border-white/10 p-6 overflow-y-auto hidden lg:block">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="text-lg">🤖</span>
              Select AI Agent
            </h3>
            <div className="space-y-2">
              {idesLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-10 glass rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : ides.length > 0 ? (
                ides.map(ide => (
                  <button
                    key={ide.id}
                    onClick={() => handleIDEChange(ide)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${selectedIDE?.id === ide.id
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30'
                        : 'glass text-gray-300 hover:bg-white/10 border border-white/5 hover:border-white/20'
                      }`}
                  >
                    {ide.name}
                  </button>
                ))
              ) : (
                <p className="text-gray-400 text-sm glass p-4 rounded-lg">No IDEs available</p>
              )}
            </div>
          </div>

          {selectedIDE && (
            <>
              <button
                onClick={handleToggleIncognito}
                className={`w-full px-4 py-3 rounded-xl text-sm font-medium mb-4 transition-all border ${
                  incognitoMode
                    ? 'bg-purple-600/20 border-purple-500/50 text-purple-200 hover:bg-purple-600/30'
                    : 'glass hover:bg-white/10 text-white border-white/10 hover:border-white/20'
                }`}
              >
                {incognitoMode ? '🕶️ Incognito ON' : '🕶️ Incognito Mode'}
              </button>
              <button
                onClick={() => setShowManifest(!showManifest)}
                className="w-full glass hover:bg-white/10 text-white px-4 py-3 rounded-xl text-sm font-medium mb-4 transition-all border border-white/10 hover:border-white/20"
              >
                {showManifest ? '👁️ Hide' : '📊 Show'} Manifest
              </button>
              {showManifest && manifest && (
                <div className="glass rounded-xl p-4 border border-white/10">
                  <ManifestViewer
                    ide={selectedIDE}
                    manifest={manifest}
                    isAdmin={false}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-2">
            {incognitoMode && (
              <div className="mb-4 bg-purple-500/20 border border-purple-500/50 rounded-xl p-4 text-sm text-purple-200 flex items-center gap-3">
                <span className="text-xl">🕶️</span>
                <div>
                  <strong>Incognito Mode Active</strong>
                  <p className="text-purple-300/80 text-xs mt-1">Your messages won't be saved to history</p>
                </div>
              </div>
            )}
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-2xl">
                  <div className="text-7xl mb-6 animate-float">💬</div>
                  <h2 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {selectedIDE ? `Chat about ${selectedIDE.name}` : 'Select an AI Agent'}
                  </h2>
                  <p className="text-gray-400 mb-6 text-lg">
                    Ask questions about documentation, features, and best practices.
                  </p>
                  <div className="glass rounded-xl p-4 inline-block">
                    <p className="text-gray-300 text-sm">
                      💡 Tip: Use <kbd className="px-2 py-1 bg-white/10 rounded">Cmd+Enter</kbd> to send messages quickly
                    </p>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message}
                onCopy={text => {
                  navigator.clipboard.writeText(text)
                }}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="glass-dark border-t border-white/10 p-6">
            {error && (
              <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-sm text-red-200 flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <div className="flex-1 flex flex-col">
                <textarea
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question... (Cmd+Enter to send)"
                  disabled={!selectedIDE || isResponseLoading}
                  className="w-full px-5 py-4 rounded-xl glass text-white placeholder-gray-500 disabled:opacity-50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-white/10 focus:border-blue-500/50 transition-all"
                  rows={3}
                />
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!selectedIDE || isResponseLoading || !inputValue.trim()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-4 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 disabled:shadow-none h-full flex items-center justify-center"
                >
                  {isResponseLoading ? '⏳' : '🚀'} Send
                </button>
                {messages.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    disabled={isResponseLoading}
                    className="glass hover:bg-white/10 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm transition-all border border-white/10 hover:border-white/20"
                  >
                    🗑️ Clear
                  </button>
                )}
              </div>
            </div>

            {/* Mobile IDE Selector */}
            {!selectedIDE && (
              <div className="mt-4 lg:hidden">
                <select
                  onChange={e => {
                    const ide = ides.find(i => i.id === e.target.value)
                    if (ide) handleIDEChange(ide)
                  }}
                  className="w-full px-4 py-3 rounded-xl glass text-white border border-white/10 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">Select an IDE...</option>
                  {ides.map(ide => (
                    <option key={ide.id} value={ide.id}>
                      {ide.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
