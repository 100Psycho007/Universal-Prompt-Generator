import { ManifestBuilder } from '@/lib/manifest-builder'
import type { FormatDetectionResult } from '@/lib/format-detector'
import { MOCK_DOC_CHUNKS, MOCK_IDE_ID, MOCK_IDE_NAME } from '../fixtures/test-data'

describe('ManifestBuilder', () => {
  let builder: ManifestBuilder

  const mockFormatDetection: FormatDetectionResult = {
    preferred_format: 'json',
    confidence_score: 85,
    detection_methods_used: ['json-file-extension', 'json-code-fence'],
    fallback_formats: [
      { format: 'markdown', confidence: 70 },
      { format: 'plaintext', confidence: 50 },
    ],
  }

  beforeEach(() => {
    builder = new ManifestBuilder()
  })

  describe('Basic Manifest Generation', () => {
    it('should generate a complete manifest', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.id).toBe(MOCK_IDE_ID)
      expect(manifest.name).toBe(MOCK_IDE_NAME)
      expect(manifest.preferred_format).toBe('json')
      expect(manifest.fallback_formats).toEqual(['markdown', 'plaintext'])
      expect(manifest.validation).toBeDefined()
      expect(manifest.templates).toBeDefined()
      expect(manifest.doc_version).toBe('latest')
      expect(manifest.doc_sources).toBeDefined()
      expect(manifest.trusted).toBe(true)
      expect(manifest.last_updated).toBeTruthy()
    })

    it('should set correct preferred format', () => {
      const markdownDetection: FormatDetectionResult = {
        preferred_format: 'markdown',
        confidence_score: 90,
        detection_methods_used: ['markdown-headings'],
        fallback_formats: [],
      }

      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        markdownDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.preferred_format).toBe('markdown')
    })

    it('should include fallback formats', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(Array.isArray(manifest.fallback_formats)).toBe(true)
      expect(manifest.fallback_formats.length).toBe(2)
    })

    it('should set custom version', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS,
        'v2.0.0'
      )

      expect(manifest.doc_version).toBe('v2.0.0')
    })

    it('should generate ISO timestamp for last_updated', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(() => new Date(manifest.last_updated)).not.toThrow()
      expect(new Date(manifest.last_updated).toISOString()).toBe(manifest.last_updated)
    })
  })

  describe('Template Generation', () => {
    it('should generate templates for all formats by default', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.templates.json).toBeDefined()
      expect(manifest.templates.markdown).toBeDefined()
      expect(manifest.templates.plaintext).toBeDefined()
      expect(manifest.templates.cli).toBeDefined()
      expect(manifest.templates.xml).toBeDefined()
    })

    it('should generate only primary format when includeAllFormats is false', () => {
      const customBuilder = new ManifestBuilder({ includeAllFormats: false })
      const manifest = customBuilder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.templates.json).toBeDefined()
      expect(manifest.templates.markdown).toBeUndefined()
      expect(manifest.templates.plaintext).toBeUndefined()
      expect(manifest.templates.cli).toBeUndefined()
      expect(manifest.templates.xml).toBeUndefined()
    })

    it('should generate valid JSON template', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(() => JSON.parse(manifest.templates.json)).not.toThrow()
      
      const jsonTemplate = JSON.parse(manifest.templates.json)
      expect(jsonTemplate.system).toBeDefined()
      expect(jsonTemplate.user).toBeDefined()
      expect(jsonTemplate.context).toBeDefined()
    })

    it('should generate valid Markdown template', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.templates.markdown).toContain('#')
      expect(manifest.templates.markdown).toContain('## System')
      expect(manifest.templates.markdown).toContain('## User')
    })

    it('should generate valid plaintext template', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.templates.plaintext).toContain('SYSTEM:')
      expect(manifest.templates.plaintext).toContain('USER:')
    })

    it('should generate valid CLI template', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.templates.cli).toContain('--system')
      expect(manifest.templates.cli).toContain('--user')
    })

    it('should generate valid XML template', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.templates.xml).toContain('<?xml')
      expect(manifest.templates.xml).toContain('<system>')
      expect(manifest.templates.xml).toContain('<user>')
    })
  })

  describe('Validation Rules Generation', () => {
    it('should generate validation rules for JSON format', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        { ...mockFormatDetection, preferred_format: 'json' },
        MOCK_DOC_CHUNKS
      )

      expect(manifest.validation.type).toBe('json-schema')
      expect(Array.isArray(manifest.validation.rules)).toBe(true)
      expect(manifest.validation.rules.length).toBeGreaterThan(0)
      expect(manifest.validation.rules.some(r => r.includes('JSON'))).toBe(true)
    })

    it('should generate validation rules for Markdown format', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        { ...mockFormatDetection, preferred_format: 'markdown' },
        MOCK_DOC_CHUNKS
      )

      expect(manifest.validation.type).toBe('markdown-schema')
      expect(manifest.validation.rules.some(r => r.includes('Markdown'))).toBe(true)
    })

    it('should generate validation rules for plaintext format', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        { ...mockFormatDetection, preferred_format: 'plaintext' },
        MOCK_DOC_CHUNKS
      )

      expect(manifest.validation.type).toBe('plaintext-schema')
      expect(manifest.validation.rules.some(r => r.toLowerCase().includes('plain'))).toBe(true)
    })

    it('should generate validation rules for CLI format', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        { ...mockFormatDetection, preferred_format: 'cli' },
        MOCK_DOC_CHUNKS
      )

      expect(manifest.validation.type).toBe('cli-schema')
      expect(manifest.validation.rules.some(r => r.includes('command'))).toBe(true)
    })

    it('should generate validation rules for XML format', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        { ...mockFormatDetection, preferred_format: 'xml' },
        MOCK_DOC_CHUNKS
      )

      expect(manifest.validation.type).toBe('xml-schema')
      expect(manifest.validation.rules.some(r => r.includes('XML'))).toBe(true)
    })

    it('should include base validation rules for all formats', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.validation.rules.some(r => r.includes('system'))).toBe(true)
      expect(manifest.validation.rules.some(r => r.includes('user'))).toBe(true)
    })
  })

  describe('Documentation Sources Extraction', () => {
    it('should extract unique source URLs', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(Array.isArray(manifest.doc_sources)).toBe(true)
      expect(manifest.doc_sources.length).toBeGreaterThan(0)
      
      // Check uniqueness
      const uniqueSources = new Set(manifest.doc_sources)
      expect(uniqueSources.size).toBe(manifest.doc_sources.length)
    })

    it('should handle chunks without source URLs', () => {
      const chunksWithoutUrls = MOCK_DOC_CHUNKS.map(chunk => ({
        ...chunk,
        source_url: null,
      }))

      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        chunksWithoutUrls
      )

      expect(manifest.doc_sources).toEqual([])
    })

    it('should sort source URLs', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      const sorted = [...manifest.doc_sources].sort()
      expect(manifest.doc_sources).toEqual(sorted)
    })

    it('should deduplicate source URLs', () => {
      const duplicatedChunks = [
        ...MOCK_DOC_CHUNKS,
        { ...MOCK_DOC_CHUNKS[0], id: 'dup-1' },
        { ...MOCK_DOC_CHUNKS[0], id: 'dup-2' },
      ]

      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        duplicatedChunks
      )

      // Should only have unique URLs
      expect(manifest.doc_sources.length).toBe(3) // From MOCK_DOC_CHUNKS
    })
  })

  describe('Template Validation', () => {
    it('should validate templates when validateTemplates is true', () => {
      const validatingBuilder = new ManifestBuilder({ validateTemplates: true })
      
      // Should not throw
      expect(() => {
        validatingBuilder.buildManifest(
          MOCK_IDE_ID,
          MOCK_IDE_NAME,
          mockFormatDetection,
          MOCK_DOC_CHUNKS
        )
      }).not.toThrow()
    })

    it('should skip validation when validateTemplates is false', () => {
      const nonValidatingBuilder = new ManifestBuilder({ validateTemplates: false })
      
      // Should not throw
      expect(() => {
        nonValidatingBuilder.buildManifest(
          MOCK_IDE_ID,
          MOCK_IDE_NAME,
          mockFormatDetection,
          MOCK_DOC_CHUNKS
        )
      }).not.toThrow()
    })

    it('should handle validation warnings gracefully', () => {
      // Console.warn should be called but not throw
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty doc chunks array', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        []
      )

      expect(manifest).toBeDefined()
      expect(manifest.doc_sources).toEqual([])
      expect(manifest.templates).toBeDefined()
    })

    it('should handle format detection with no fallbacks', () => {
      const noFallbackDetection: FormatDetectionResult = {
        preferred_format: 'json',
        confidence_score: 95,
        detection_methods_used: ['json-schema'],
        fallback_formats: [],
      }

      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        noFallbackDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.fallback_formats).toEqual([])
    })

    it('should handle special characters in IDE name', () => {
      const specialName = 'IDE <>&"\' Test'
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        specialName,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.name).toBe(specialName)
    })

    it('should handle empty IDE ID', () => {
      const manifest = builder.buildManifest(
        '',
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.id).toBe('')
    })

    it('should handle very long IDE names', () => {
      const longName = 'x'.repeat(1000)
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        longName,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.name).toBe(longName)
    })
  })

  describe('Required Fields', () => {
    it('should always include id field', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.id).toBeDefined()
      expect(typeof manifest.id).toBe('string')
    })

    it('should always include name field', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.name).toBeDefined()
      expect(typeof manifest.name).toBe('string')
    })

    it('should always include preferred_format field', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.preferred_format).toBeDefined()
    })

    it('should always include fallback_formats field', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.fallback_formats).toBeDefined()
      expect(Array.isArray(manifest.fallback_formats)).toBe(true)
    })

    it('should always include validation field', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.validation).toBeDefined()
      expect(manifest.validation.type).toBeDefined()
      expect(manifest.validation.rules).toBeDefined()
    })

    it('should always include templates field', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.templates).toBeDefined()
      expect(typeof manifest.templates).toBe('object')
    })

    it('should always include doc_version field', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.doc_version).toBeDefined()
      expect(typeof manifest.doc_version).toBe('string')
    })

    it('should always include doc_sources field', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.doc_sources).toBeDefined()
      expect(Array.isArray(manifest.doc_sources)).toBe(true)
    })

    it('should always include trusted field', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.trusted).toBeDefined()
      expect(typeof manifest.trusted).toBe('boolean')
    })

    it('should always include last_updated field', () => {
      const manifest = builder.buildManifest(
        MOCK_IDE_ID,
        MOCK_IDE_NAME,
        mockFormatDetection,
        MOCK_DOC_CHUNKS
      )

      expect(manifest.last_updated).toBeDefined()
      expect(typeof manifest.last_updated).toBe('string')
    })
  })

  describe('All Format Support', () => {
    const formats: Array<'json' | 'markdown' | 'plaintext' | 'cli' | 'xml'> = [
      'json',
      'markdown',
      'plaintext',
      'cli',
      'xml',
    ]

    formats.forEach((format) => {
      it(`should support ${format} format`, () => {
        const detection: FormatDetectionResult = {
          preferred_format: format,
          confidence_score: 80,
          detection_methods_used: [`${format}-test`],
          fallback_formats: [],
        }

        const manifest = builder.buildManifest(
          MOCK_IDE_ID,
          MOCK_IDE_NAME,
          detection,
          MOCK_DOC_CHUNKS
        )

        expect(manifest.preferred_format).toBe(format)
        expect(manifest.validation.type).toBe(`${format}-schema`)
      })
    })
  })
})
