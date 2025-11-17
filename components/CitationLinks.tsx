'use client'

import React from 'react'

interface Citation {
  url: string | null
  text: string
  section: string | null
  similarity: number
}

interface CitationLinksProps {
  sources: Citation[]
}

export const CitationLinks: React.FC<CitationLinksProps> = ({ sources }) => {
  if (!sources || sources.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-400 uppercase">Sources</p>
      <div className="space-y-1">
        {sources.map((source, index) => (
          <div key={index} className="text-xs">
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-blue-200 hover:underline break-all"
              >
                {source.section ? `[${source.section}]` : '[Documentation]'}
                {' '}
                {source.similarity && (
                  <span className="text-gray-500">
                    ({(source.similarity * 100).toFixed(0)}% match)
                  </span>
                )}
              </a>
            ) : (
              <span className="text-gray-400">
                {source.section ? `[${source.section}]` : '[Documentation]'}
                {source.similarity && (
                  <span className="text-gray-500">
                    {' '}({(source.similarity * 100).toFixed(0)}% match)
                  </span>
                )}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
