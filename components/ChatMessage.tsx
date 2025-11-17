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
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-lg ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-700 text-gray-100 rounded-bl-none'
        }`}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-current rounded-full animate-bounce delay-200"></div>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed break-words">{message.content}</p>

            {!isUser && message.metadata?.sources && message.metadata.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-600">
                <CitationLinks sources={message.metadata.sources} />
              </div>
            )}

            {!isUser && message.metadata && (
              <div className="mt-2 text-xs text-gray-400 space-y-1">
                {message.metadata.model && (
                  <p>Model: {message.metadata.model}</p>
                )}
                {message.metadata.tokensUsed && (
                  <p>Tokens: {message.metadata.tokensUsed.total}</p>
                )}
                {message.metadata.confidence && (
                  <p className="capitalize">
                    Confidence: {' '}
                    <span
                      className={
                        message.metadata.confidence === 'high'
                          ? 'text-green-400'
                          : message.metadata.confidence === 'medium'
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }
                    >
                      {message.metadata.confidence}
                    </span>
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {!message.isLoading && !isUser && (
          <button
            onClick={handleCopy}
            className="mt-2 text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded transition"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  )
}
