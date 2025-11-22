import React, { useState } from 'react'
import { IDESelector } from '../components/IDESelectorMock'
import { PromptBuilder, type PromptBuilderParams } from '../components/PromptBuilder'
import { PromptDisplay } from '../components/PromptDisplay'

// Mock IDE data for testing
const mockIDEs = [
  {
    id: '1',
    name: 'Visual Studio Code',
    docs_url: 'https://code.visualstudio.com/docs',
    status: 'active',
    manifest: {
      preferred_formats: ['json', 'markdown'],
      fallback_formats: ['plaintext']
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'IntelliJ IDEA',
    docs_url: 'https://www.jetbrains.com/idea/documentation/',
    status: 'active',
    manifest: {
      preferred_formats: ['json', 'markdown'],
      fallback_formats: ['plaintext']
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Sublime Text',
    docs_url: 'https://www.sublimetext.com/docs/',
    status: 'active',
    manifest: {
      preferred_formats: ['json', 'markdown'],
      fallback_formats: ['plaintext']
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

export default function TestPage() {
  const [selectedIDE, setSelectedIDE] = useState<any>(null)
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null)
  const [promptFormat, setPromptFormat] = useState<string>('JSON')
  const [validation, setValidation] = useState({
    isValid: true,
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock generated prompt
      const mockPrompt = `{
  "task": "${params.task}",
  "language": "${params.language}",
  "ide": "${selectedIDE.name}",
  "context": {
    "files": ${params.files.length},
    "constraints": ${JSON.stringify(params.constraints, null, 2)}
  },
  "instructions": "You are a helpful assistant specialized in ${selectedIDE.name}. ${params.task}"
}`

      setGeneratedPrompt(mockPrompt)
      setPromptFormat('JSON')
      setValidation({
        isValid: true,
        errors: [],
        warnings: ['This is a mock response']
      })
      setUsedFallback(false)
      setAttempts([
        { format: 'JSON', success: true }
      ])
    } catch (error) {
      console.error('Error generating prompt:', error)
      alert('Failed to generate prompt')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTryAnotherFormat = () => {
    // Mock implementation
    alert('Would try another format')
  }

  const handleSave = () => {
    alert('Prompt saved!')
  }

  const handleCopy = () => {
    // Copy feedback handled in component
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                IDE Prompt Generator - Test
              </h1>
              <span className="ml-4 text-sm text-gray-500">
                (Using Mock Data)
              </span>
            </div>
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
                    <p>✓ Choose from supported IDEs</p>
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
    </div>
  )
}