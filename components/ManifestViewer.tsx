'use client'

import React, { useState } from 'react'
import type { IDE } from '@/types/database'
import type { IDEManifest } from '@/lib/manifest-builder'

interface ManifestViewerProps {
  ide: IDE
  manifest?: IDEManifest | null
  isAdmin?: boolean
  onRebuild?: () => Promise<void>
}

export const ManifestViewer: React.FC<ManifestViewerProps> = ({
  ide,
  manifest,
  isAdmin = false,
  onRebuild
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']))
  const [isRebuilding, setIsRebuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleSection = (section: string) => {
    const newSections = new Set(expandedSections)
    if (newSections.has(section)) {
      newSections.delete(section)
    } else {
      newSections.add(section)
    }
    setExpandedSections(newSections)
  }

  const handleRebuild = async () => {
    if (!onRebuild || !isAdmin) return

    try {
      setIsRebuilding(true)
      setError(null)
      await onRebuild()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rebuild manifest')
    } finally {
      setIsRebuilding(false)
    }
  }

  const renderTemplate = (template: string, content: string) => {
    if (template === 'json') {
      return (
        <pre className="bg-gray-900 p-3 rounded text-xs overflow-x-auto text-gray-300">
          <code>{content}</code>
        </pre>
      )
    }

    return (
      <pre className="bg-gray-900 p-3 rounded text-xs overflow-x-auto text-gray-300 whitespace-pre-wrap break-words">
        <code>{content}</code>
      </pre>
    )
  }

  if (!manifest) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Manifest</h3>
        <p className="text-gray-400">No manifest available for this IDE.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">{ide.name} Manifest</h3>
            {manifest.last_updated && (
              <p className="text-sm text-gray-400">
                Last updated: {new Date(manifest.last_updated).toLocaleDateString()}
              </p>
            )}
          </div>
          {isAdmin && (
            <button
              onClick={handleRebuild}
              disabled={isRebuilding}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium transition"
            >
              {isRebuilding ? 'Rebuilding...' : 'Rebuild Manifest'}
            </button>
          )}
        </div>
        {error && (
          <div className="mt-3 bg-red-500/20 border border-red-500 rounded p-2 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="divide-y divide-gray-700">
        {/* Overview */}
        <div className="border-b border-gray-700">
          <button
            onClick={() => toggleSection('overview')}
            className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-700/50 transition"
          >
            <span className="font-semibold text-white">Overview</span>
            <span className="text-gray-400">
              {expandedSections.has('overview') ? '−' : '+'}
            </span>
          </button>
          {expandedSections.has('overview') && (
            <div className="px-6 py-4 bg-gray-900/50 space-y-3">
              <div>
                <p className="text-sm text-gray-400">Preferred Format</p>
                <p className="text-white font-mono">
                  {manifest.preferred_format || 'N/A'}
                </p>
              </div>
              {manifest.fallback_formats && manifest.fallback_formats.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400">Fallback Formats</p>
                  <p className="text-white font-mono">
                    {(manifest.fallback_formats as string[]).join(', ') || 'N/A'}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-400">Documentation Version</p>
                <p className="text-white font-mono">{manifest.doc_version || 'N/A'}</p>
              </div>
              {manifest.trusted !== undefined && (
                <div>
                  <p className="text-sm text-gray-400">Trusted</p>
                  <p className="text-white">
                    {manifest.trusted ? (
                      <span className="text-green-400">✓ Yes</span>
                    ) : (
                      <span className="text-red-400">✗ No</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Documentation Sources */}
        {manifest.doc_sources && manifest.doc_sources.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('sources')}
              className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-700/50 transition"
            >
              <span className="font-semibold text-white">
                Documentation Sources ({manifest.doc_sources.length})
              </span>
              <span className="text-gray-400">
                {expandedSections.has('sources') ? '−' : '+'}
              </span>
            </button>
            {expandedSections.has('sources') && (
              <div className="px-6 py-4 bg-gray-900/50 space-y-2">
                {manifest.doc_sources.map((source, index) => (
                  <a
                    key={index}
                    href={source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-400 hover:text-blue-300 text-sm break-all hover:underline"
                  >
                    {source}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Templates */}
        {manifest.templates && Object.keys(manifest.templates).length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('templates')}
              className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-700/50 transition"
            >
              <span className="font-semibold text-white">
                Templates ({Object.keys(manifest.templates).length})
              </span>
              <span className="text-gray-400">
                {expandedSections.has('templates') ? '−' : '+'}
              </span>
            </button>
            {expandedSections.has('templates') && (
              <div className="px-6 py-4 bg-gray-900/50 space-y-4">
                {Object.entries(manifest.templates).map(([templateName, templateContent]) => (
                  <div key={templateName}>
                    <p className="text-sm font-semibold text-gray-300 mb-2 capitalize">
                      {templateName}
                    </p>
                    {renderTemplate(
                      templateName,
                      typeof templateContent === 'string'
                        ? templateContent
                        : JSON.stringify(templateContent, null, 2)
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Validation Rules */}
        {manifest.validation && (
          <div>
            <button
              onClick={() => toggleSection('validation')}
              className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-700/50 transition"
            >
              <span className="font-semibold text-white">Validation Rules</span>
              <span className="text-gray-400">
                {expandedSections.has('validation') ? '−' : '+'}
              </span>
            </button>
            {expandedSections.has('validation') && (
              <div className="px-6 py-4 bg-gray-900/50 space-y-2">
                <div>
                  <p className="text-sm text-gray-400">Type</p>
                  <p className="text-white font-mono">{manifest.validation.type}</p>
                </div>
                {manifest.validation.rules && manifest.validation.rules.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Rules</p>
                    <ul className="space-y-1">
                      {manifest.validation.rules.map((rule, index) => (
                        <li key={index} className="text-white text-sm">
                          • {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
