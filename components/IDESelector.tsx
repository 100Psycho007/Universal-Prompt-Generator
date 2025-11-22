'use client'

import React, { useState, useEffect } from 'react'
import type { IDE } from '@/types/database'

interface IDESelectorProps {
  selectedIDE: IDE | null
  onIDESelect: (ide: IDE) => void
  className?: string
}

// Mock IDE data for testing - replace with real API call
const mockIDEs: IDE[] = [
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
  },
  {
    id: '4',
    name: 'Atom',
    docs_url: 'https://flight-manual.atom.io/',
    status: 'active',
    manifest: {
      preferred_formats: ['json', 'markdown'],
      fallback_formats: ['plaintext']
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Vim',
    docs_url: 'https://vimhelp.org/',
    status: 'active',
    manifest: {
      preferred_formats: ['json', 'markdown'],
      fallback_formats: ['plaintext']
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: '6',
    name: 'Emacs',
    docs_url: 'https://www.gnu.org/software/emacs/manual/',
    status: 'active',
    manifest: {
      preferred_formats: ['json', 'markdown'],
      fallback_formats: ['plaintext']
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

export const IDESelector: React.FC<IDESelectorProps> = ({
  selectedIDE,
  onIDESelect,
  className = ''
}) => {
  const [ides, setIDEs] = useState<IDE[]>(mockIDEs)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    fetchIDEs()
  }, [])

  const fetchIDEs = async () => {
    setLoading(true)
    try {
      // In a real implementation, this would fetch from the API
      // For now, using mock data
      await new Promise(resolve => setTimeout(resolve, 500))
      setIDEs(mockIDEs)
    } catch (error) {
      console.error('Error fetching IDEs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredIDEs = ides.filter(ide =>
    ide.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'ingesting':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Select an IDE</h2>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search IDEs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
          />
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {filteredIDEs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No IDEs found matching your search.</p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-2'
        }>
          {filteredIDEs.map((ide) => (
            <div
              key={ide.id}
              onClick={() => onIDESelect(ide)}
              className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                selectedIDE?.id === ide.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${
                viewMode === 'list' ? 'flex items-center justify-between' : ''
              }`}
            >
              {viewMode === 'grid' ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-600">
                        {ide.name.charAt(0)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{ide.name}</h3>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ide.status)}`}>
                      {ide.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-500">
                    Updated: {formatDate(ide.updated_at)}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-600">
                        {ide.name.charAt(0)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{ide.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ide.status)}`}>
                      {ide.status}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-500">
                    Updated: {formatDate(ide.updated_at)}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}