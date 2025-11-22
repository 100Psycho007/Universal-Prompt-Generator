'use client'

import React, { useState } from 'react'

interface PromptBuilderProps {
  selectedIDE: any
  onGenerate: (params: PromptBuilderParams) => void
  isLoading?: boolean
  className?: string
}

export interface PromptBuilderParams {
  task: string
  language: string
  files: FileInput[]
  constraints: {
    maxTokens?: number
    outputFormat?: string
    includeExamples?: boolean
    temperature?: number
  }
}

interface FileInput {
  path: string
  content: string
}

const SUPPORTED_LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#',
  'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'Dart', 'Shell', 'SQL'
]

const OUTPUT_FORMATS = [
  'JSON', 'Markdown', 'Plain Text', 'YAML', 'XML'
]

export const PromptBuilder: React.FC<PromptBuilderProps> = ({
  selectedIDE,
  onGenerate,
  isLoading = false,
  className = ''
}) => {
  const [task, setTask] = useState('')
  const [language, setLanguage] = useState('JavaScript')
  const [files, setFiles] = useState<FileInput[]>([])
  const [constraints, setConstraints] = useState({
    maxTokens: 1000,
    outputFormat: 'JSON',
    includeExamples: true,
    temperature: 0.7
  })
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleFileAdd = () => {
    const newFile: FileInput = {
      path: '',
      content: ''
    }
    setFiles([...files, newFile])
  }

  const handleFileRemove = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleFileChange = (index: number, field: keyof FileInput, value: string) => {
    const updatedFiles = [...files]
    updatedFiles[index] = { ...updatedFiles[index], [field]: value }
    setFiles(updatedFiles)
  }

  const handleGenerate = () => {
    if (!task.trim()) {
      alert('Please enter a task description')
      return
    }

    onGenerate({
      task: task.trim(),
      language,
      files,
      constraints
    })
  }

  const handlePasteCode = () => {
    const pastedCode = prompt('Paste your code here:')
    if (pastedCode) {
      const newFile: FileInput = {
        path: `pasted-code.${language.toLowerCase()}`,
        content: pastedCode
      }
      setFiles([...files, newFile])
    }
  }

  return (
    <div className={`p-6 ${className}`}>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Build Your Prompt</h2>
      
      {selectedIDE && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Selected IDE:</strong> {selectedIDE.name}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Task Description */}
        <div>
          <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-2">
            Task Description *
          </label>
          <textarea
            id="task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Describe what you want the AI to help you with..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
          />
        </div>

        {/* Language Selection */}
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
            Programming Language
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        {/* Code Files */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Code Files (Optional)
            </label>
            <div className="space-x-2">
              <button
                type="button"
                onClick={handlePasteCode}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Paste Code
              </button>
              <button
                type="button"
                onClick={handleFileAdd}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Add File
              </button>
            </div>
          </div>

          {files.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No files added. Add code files to provide context.</p>
          ) : (
            <div className="space-y-3">
              {files.map((file, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      placeholder="File path (e.g., src/app.js)"
                      value={file.path}
                      onChange={(e) => handleFileChange(index, 'path', e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => handleFileRemove(index)}
                      className="ml-2 text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    placeholder="Paste or type your code here..."
                    value={file.content}
                    onChange={(e) => handleFileChange(index, 'content', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={6}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Advanced Constraints */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm text-gray-700 hover:text-gray-900"
          >
            <span className="mr-2">{showAdvanced ? '▼' : '▶'}</span>
            Advanced Constraints
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-700 mb-1">
                    Max Tokens
                  </label>
                  <input
                    id="maxTokens"
                    type="number"
                    value={constraints.maxTokens}
                    onChange={(e) => setConstraints({...constraints, maxTokens: parseInt(e.target.value) || 1000})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="100"
                    max="4000"
                  />
                </div>

                <div>
                  <label htmlFor="outputFormat" className="block text-sm font-medium text-gray-700 mb-1">
                    Output Format
                  </label>
                  <select
                    id="outputFormat"
                    value={constraints.outputFormat}
                    onChange={(e) => setConstraints({...constraints, outputFormat: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {OUTPUT_FORMATS.map(format => (
                      <option key={format} value={format}>{format}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">
                    Temperature ({constraints.temperature})
                  </label>
                  <input
                    id="temperature"
                    type="range"
                    value={constraints.temperature}
                    onChange={(e) => setConstraints({...constraints, temperature: parseFloat(e.target.value)})}
                    className="w-full"
                    min="0"
                    max="1"
                    step="0.1"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="includeExamples"
                    type="checkbox"
                    checked={constraints.includeExamples}
                    onChange={(e) => setConstraints({...constraints, includeExamples: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="includeExamples" className="text-sm font-medium text-gray-700">
                    Include Examples
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div className="flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={isLoading || !selectedIDE || !task.trim()}
            className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Generating...
              </>
            ) : (
              'Generate Prompt'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}