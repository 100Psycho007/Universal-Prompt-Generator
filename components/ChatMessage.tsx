'use client'

import React from 'react'
import { CitationLinks } from './CitationLinks'

export interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  metadata?: {
    model?: string
    tokensUsed?: {
      prompt: number
      completion: number
      total: number
    }
    sources?: Array<{
      url: string | null
      text: string
      section: string | null
      similarity: number
    }>
    confidence?: 'high' | 'medium' | 'low'
  }
  isLoading?: boolean
}

interface ChatMessageProps {
  message: Message
  onCopy?: (content: string) => void
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onCopy }) => {
  const isUser = message.role === 'user'
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    onCopy?.(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div
        className={`max-w-xs lg:max-w-md xl:max-w-2xl px-5 py-4 rounded-2xl relative transition-all duration-300 ${
          isUser
            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 rounded-br-sm'
            : 'glass-dark text-gray-100 border border-white/10 hover:border-white/20 rounded-bl-sm'
        }`}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-current rounded-full animate-bounce"></div>
            <div className="w-2.5 h-2.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2.5 h-2.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>

            {!isUser && message.metadata?.sources && message.metadata.sources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <CitationLinks sources={message.metadata.sources} />
              </div>
            )}

            {!isUser && message.metadata && (
              <div className="mt-3 text-xs text-gray-400 space-y-1 flex flex-wrap gap-3">
                {message.metadata.model && (
                  <span className="px-2 py-1 bg-white/5 rounded-md">Model: {message.metadata.model}</span>
                )}
                {message.metadata.tokensUsed && (
                  <span className="px-2 py-1 bg-white/5 rounded-md">Tokens: {message.metadata.tokensUsed.total}</span>
                )}
                {message.metadata.confidence && (
                  <span className={`px-2 py-1 rounded-md ${
                    message.metadata.confidence === 'high'
                      ? 'bg-green-500/20 text-green-300'
                      : message.metadata.confidence === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {message.metadata.confidence} confidence
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {!message.isLoading && !isUser && (
          <button
            onClick={handleCopy}
            className="mt-3 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all duration-200 border border-white/10 hover:border-white/20"
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        )}
      </div>
    </div>
  )
}
