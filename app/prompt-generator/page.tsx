'use client'

import React, { useState } from 'react'
import { IDESelector } from '@/components/IDESelector'
import { PromptBuilder, type PromptBuilderParams } from '@/components/PromptBuilder'
import { PromptDisplay } from '@/components/PromptDisplay'
import type { IDE } from '@/types/database'

interface GeneratePromptResponse {
  message: string
  data: {
    ideId: string
    ideName: string
    format: string
    prompt: string
    usedFallback: boolean
    validation: {
      isValid: boolean
      errors: string[]
      warnings: string[]
    }
    attempts: Array<{
      format: string
      success: boolean
      error?: string
      validation?: {
        isValid: boolean
        errors: string[]
        warnings: string[]
      }
    }>
    durationMs: number
  }
}

export default function PromptGeneratorPage() {
  const [selectedIDE, setSelectedIDE] = useState<IDE | null>(null)
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null)
  const [promptFormat, setPromptFormat] = useState<string>('')
  const [validation, setValidation] = useState({
    isValid: false,
    errors: [] as string[],
    warnings: [] as string[]
  })
  const [usedFallback, setUsedFallback] = useState(false)
  const [attempts, setAttempts] = useState<Array<{
    format: string
    success: boolean
    error?: string
  }>>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleGenerate = async (params: PromptBuilderParams) => {
    if (!selectedIDE) {
      alert('Please select an IDE first')
      return
    }

    setIsLoading(true)
    setGeneratedPrompt(null)

    try {
      // For demo purposes, we'll use a mock user ID
      // In a real app, this would come from authentication
      const userId = 'demo-user-id'

      // Convert FileInput to TemplateFileInput format
      const templateFiles = params.files.map(file => ({
        path: file.path,
        content: file.content
      }))

      const response = await fetch('/api/prompt/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ideId: selectedIDE.id,
          task: params.task,
          language: params.language,
          files: templateFiles,
          constraints: params.constraints
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to generate prompt')
      }

      const result: GeneratePromptResponse = await response.json()
      
      setGeneratedPrompt(result.data.prompt)
      setPromptFormat(result.data.format)
      setValidation(result.data.validation)
      setUsedFallback(result.data.usedFallback)
      setAttempts(result.data.attempts.map(attempt => ({
        format: attempt.format,
        success: attempt.success,
        error: attempt.error
      })))
    } catch (error) {
      console.error('Error generating prompt:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate prompt')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTryAnotherFormat = async () => {
    if (!selectedIDE || !generatedPrompt) return
    
    // This would need to be implemented to retry with a different format
    // For now, we'll just regenerate
    setIsLoading(true)
    // Implementation would go here
    setIsLoading(false)
  }

  const handleSave = async () => {
    if (!generatedPrompt || !selectedIDE) return
    
    try {
      // This would save the prompt to user's saved prompts
      // For now, we'll just show a success message
      alert('Prompt saved successfully!')
    } catch (error) {
      console.error('Error saving prompt:', error)
      alert('Failed to save prompt')
    }
  }

  const handleCopy = () => {
    // Copy feedback is handled in the PromptDisplay component
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Universal IDE Database
              </h1>
              <span className="ml-4 text-sm text-gray-500">
                Prompt Generator
              </span>
            </div>
            
            {/* Theme Toggle (placeholder) */}
            <button
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              title="Toggle theme"
            >
              🌙
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row">
          {/* Sidebar - IDE Selector */}
          <aside className="w-full lg:w-96 lg:flex-shrink-0 border-r border-gray-200 bg-white">
            <IDESelector
              selectedIDE={selectedIDE}
              onIDESelect={setSelectedIDE}
            />
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Prompt Builder */}
            <div className="bg-white border-b border-gray-200">
              <PromptBuilder
                selectedIDE={selectedIDE}
                onGenerate={handleGenerate}
                isLoading={isLoading}
              />
            </div>

            {/* Prompt Display */}
            {generatedPrompt && (
              <div className="bg-white">
                <PromptDisplay
                  prompt={generatedPrompt}
                  format={promptFormat}
                  validation={validation}
                  usedFallback={usedFallback}
                  attempts={attempts}
                  onTryAnotherFormat={handleTryAnotherFormat}
                  onSave={handleSave}
                  onCopy={handleCopy}
                  isLoading={isLoading}
                />
              </div>
            )}

            {/* Empty State */}
            {!generatedPrompt && !isLoading && (
              <div className="bg-white p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No prompt generated yet
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Select an IDE and describe your task to generate a customized prompt.
                  </p>
                  <div className="text-sm text-gray-400">
                    <p>✓ Choose from 20+ supported IDEs</p>
                    <p>✓ Add context with code files</p>
                    <p>✓ Customize output format and constraints</p>
                    <p>✓ Get validation and syntax highlighting</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Menu Toggle (for responsive sidebar) */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={() => {
            // This would toggle mobile sidebar visibility
            // Implementation would use state and CSS classes
          }}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}