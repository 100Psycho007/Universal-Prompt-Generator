'use client'

import React, { useState } from 'react'

interface PromptDisplayProps {
  prompt: string
  format: string
  validation: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
  usedFallback: boolean
  attempts: Array<{
    format: string
    success: boolean
    error?: string
  }>
  onTryAnotherFormat?: () => void
  onSave?: () => void
  onCopy?: () => void
  isLoading?: boolean
  className?: string
}

export const PromptDisplay: React.FC<PromptDisplayProps> = ({
  prompt,
  format,
  validation,
  usedFallback,
  attempts,
  onTryAnotherFormat,
  onSave,
  onCopy,
  isLoading = false,
  className = ''
}) => {
  const [copied, setCopied] = useState(false)
  const [showValidation, setShowValidation] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      onCopy?.()
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const getLanguageClass = (format: string) => {
    switch (format.toLowerCase()) {
      case 'json':
        return 'language-json'
      case 'markdown':
      case 'md':
        return 'language-markdown'
      case 'yaml':
        return 'language-yaml'
      case 'xml':
        return 'language-xml'
      case 'javascript':
      case 'js':
        return 'language-javascript'
      case 'typescript':
      case 'ts':
        return 'language-typescript'
      case 'python':
      case 'py':
        return 'language-python'
      default:
        return 'language-text'
    }
  }

  const renderPromptWithHighlighting = () => {
    // Simple syntax highlighting - in a real app, you'd use a library like Prism.js or highlight.js
    const highlighted = prompt
      .replace(/(".*?")/g, '<span class="text-green-600">$1</span>')
      .replace(/(\b\w+\s*:)/g, '<span class="text-blue-600 font-semibold">$1</span>')
      .replace(/(\b(true|false|null)\b)/g, '<span class="text-purple-600">$1</span>')
      .replace(/(\b\d+\b)/g, '<span class="text-orange-600">$1</span>')

    return highlighted
  }

  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">Generated Prompt</h2>
          
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              validation.isValid 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {validation.isValid ? '✓ Valid' : '✗ Invalid'}
            </span>
            
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {format}
            </span>
            
            {usedFallback && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Fallback Used
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowValidation(!showValidation)}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            {showValidation ? 'Hide' : 'Show'} Validation
          </button>
          
          {onTryAnotherFormat && (
            <button
              onClick={onTryAnotherFormat}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Try Another Format
            </button>
          )}
          
          {onSave && (
            <button
              onClick={onSave}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
            >
              Save
            </button>
          )}
          
          <button
            onClick={handleCopy}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Validation Details */}
      {showValidation && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Validation Details</h3>
          
          {validation.errors.length > 0 && (
            <div className="mb-2">
              <p className="text-sm font-medium text-red-800">Errors:</p>
              <ul className="list-disc list-inside text-sm text-red-700">
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validation.warnings.length > 0 && (
            <div>
              <p className="text-sm font-medium text-yellow-800">Warnings:</p>
              <ul className="list-disc list-inside text-sm text-yellow-700">
                {validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validation.errors.length === 0 && validation.warnings.length === 0 && (
            <p className="text-sm text-green-700">✓ No validation issues found</p>
          )}
        </div>
      )}

      {/* Attempts Summary */}
      {attempts.length > 1 && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Generation Attempts</h3>
          <div className="space-y-1">
            {attempts.map((attempt, index) => (
              <div key={index} className="flex items-center text-sm">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2 ${
                  attempt.success 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {attempt.success ? '✓' : '✗'}
                </span>
                <span className="text-gray-700">{attempt.format}</span>
                {attempt.error && (
                  <span className="text-red-600 text-xs ml-2">({attempt.error})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prompt Content */}
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLanguageClass(format)} bg-gray-100 text-gray-700`}>
            {format}
          </span>
        </div>
        
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm leading-relaxed">
            <code 
              dangerouslySetInnerHTML={{ 
                __html: renderPromptWithHighlighting() 
              }}
            />
          </pre>
        </div>
      </div>

      {/* Prompt Stats */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <div>
          <span>Characters: {prompt.length}</span>
          <span className="mx-2">•</span>
          <span>Words: {prompt.split(/\s+/).filter(Boolean).length}</span>
          <span className="mx-2">•</span>
          <span>Lines: {prompt.split('\n').length}</span>
        </div>
        
        {copied && (
          <span className="text-green-600">Copied to clipboard!</span>
        )}
      </div>
    </div>
  )
}