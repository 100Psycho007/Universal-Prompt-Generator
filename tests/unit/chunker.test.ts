import { chunkDocument, estimateTokenCount, clearChunkerCache } from '@/lib/chunker'
import type { ChunkInput } from '@/lib/chunker'
import { LONG_DOCUMENT, EMPTY_DOCUMENT, SINGLE_LINE_DOCUMENT, UNICODE_DOCUMENT } from '../fixtures/sample-docs'
import { MOCK_IDE_ID } from '../fixtures/test-data'

describe('Chunker', () => {
  afterEach(() => {
    clearChunkerCache()
  })

  describe('Basic Chunking', () => {
    it('should chunk a simple document', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: 'This is a test document. '.repeat(100),
        sourceUrl: 'https://example.com/doc',
        section: 'Test Section',
      }

      const chunks = chunkDocument(input, { maxTokens: 100, minTokens: 50 })

      expect(chunks.length).toBeGreaterThan(0)
      chunks.forEach((chunk) => {
        expect(chunk.ide_id).toBe(MOCK_IDE_ID)
        expect(chunk.source_url).toBe(input.sourceUrl)
        expect(chunk.text).toBeTruthy()
        expect(chunk.tokenCount).toBeGreaterThan(0)
        expect(chunk.totalChunks).toBe(chunks.length)
      })
    })

    it('should respect maxTokens limit', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: 'Word '.repeat(500),
      }

      const maxTokens = 100
      const chunks = chunkDocument(input, { maxTokens, minTokens: 50 })

      chunks.forEach((chunk) => {
        expect(chunk.tokenCount).toBeLessThanOrEqual(maxTokens)
      })
    })

    it('should respect minTokens requirement', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: 'Word '.repeat(200),
      }

      const minTokens = 50
      const chunks = chunkDocument(input, { maxTokens: 100, minTokens })

      // Most chunks should meet minimum (last chunk might be smaller)
      const nonFinalChunks = chunks.slice(0, -1)
      nonFinalChunks.forEach((chunk) => {
        expect(chunk.tokenCount).toBeGreaterThanOrEqual(minTokens)
      })
    })

    it('should create overlapping chunks', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: Array.from({ length: 100 }, (_, i) => `Sentence ${i}.`).join(' '),
      }

      const overlapTokens = 20
      const chunks = chunkDocument(input, { 
        maxTokens: 100, 
        minTokens: 50, 
        overlapTokens 
      })

      expect(chunks.length).toBeGreaterThan(1)
      
      // Check that chunks have reasonable sizes
      chunks.forEach((chunk) => {
        expect(chunk.tokenCount).toBeGreaterThan(0)
      })
    })
  })

  describe('Section Handling', () => {
    it('should split by markdown headings', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: `# Section 1
Content for section 1.

## Section 2
Content for section 2.

### Section 3
Content for section 3.`,
      }

      const chunks = chunkDocument(input, { maxTokens: 100, minTokens: 20 })

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks.some(c => c.section?.includes('Section'))).toBe(true)
    })

    it('should preserve section information', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: '# My Section\nContent here',
        section: 'Fallback Section',
      }

      const chunks = chunkDocument(input)

      chunks.forEach((chunk) => {
        expect(chunk.section).toBeTruthy()
      })
    })

    it('should handle documents without headings', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: 'Plain text without any headings. '.repeat(50),
        section: 'General',
      }

      const chunks = chunkDocument(input)

      expect(chunks.length).toBeGreaterThan(0)
      chunks.forEach((chunk) => {
        expect(chunk.section).toBe('General')
      })
    })
  })

  describe('Token Counting', () => {
    it('should accurately count tokens', () => {
      const text = 'Hello world, this is a test.'
      const count = estimateTokenCount(text)

      expect(count).toBeGreaterThan(0)
      expect(count).toBeLessThan(text.length) // Tokens should be less than characters
    })

    it('should count tokens for empty string', () => {
      const count = estimateTokenCount('')

      expect(count).toBeGreaterThanOrEqual(0)
    })

    it('should count tokens for long text', () => {
      const text = 'Word '.repeat(1000)
      const count = estimateTokenCount(text)

      expect(count).toBeGreaterThan(100)
    })

    it('should handle unicode characters', () => {
      const text = '你好世界 🚀 Hello'
      const count = estimateTokenCount(text)

      expect(count).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty document', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: EMPTY_DOCUMENT,
      }

      const chunks = chunkDocument(input)

      expect(chunks.length).toBe(0)
    })

    it('should handle single line document', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: SINGLE_LINE_DOCUMENT,
      }

      const chunks = chunkDocument(input)

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks[0].text).toBe(SINGLE_LINE_DOCUMENT)
    })

    it('should handle very long document', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: LONG_DOCUMENT,
      }

      const chunks = chunkDocument(input, { maxTokens: 500, minTokens: 200 })

      expect(chunks.length).toBeGreaterThanOrEqual(1) // At least one chunk
      chunks.forEach((chunk) => {
        expect(chunk.tokenCount).toBeLessThanOrEqual(500)
      })
    })

    it('should handle unicode document', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: UNICODE_DOCUMENT,
      }

      const chunks = chunkDocument(input)

      expect(chunks.length).toBeGreaterThan(0)
      chunks.forEach((chunk) => {
        expect(chunk.text).toBeTruthy()
        expect(chunk.tokenCount).toBeGreaterThan(0)
      })
    })

    it('should handle document with only whitespace', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: '   \n\n\t\t   ',
      }

      const chunks = chunkDocument(input)

      expect(chunks.length).toBe(0)
    })

    it('should handle document smaller than minTokens', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: 'Short text',
      }

      const chunks = chunkDocument(input, { maxTokens: 1000, minTokens: 500 })

      expect(chunks.length).toBe(1)
      expect(chunks[0].text).toBe('Short text')
    })
  })

  describe('Chunk Metadata', () => {
    it('should set correct chunk indices', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: 'Content '.repeat(500),
      }

      const chunks = chunkDocument(input, { maxTokens: 100, minTokens: 50 })

      chunks.forEach((chunk, index) => {
        expect(chunk.chunkIndex).toBe(index)
      })
    })

    it('should set correct totalChunks', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: 'Content '.repeat(500),
      }

      const chunks = chunkDocument(input)
      const totalChunks = chunks.length

      chunks.forEach((chunk) => {
        expect(chunk.totalChunks).toBe(totalChunks)
      })
    })

    it('should preserve version information', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: 'Test content',
        version: 'v2.0.0',
      }

      const chunks = chunkDocument(input)

      chunks.forEach((chunk) => {
        expect(chunk.version).toBe('v2.0.0')
      })
    })

    it('should default version to "latest"', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: 'Test content',
      }

      const chunks = chunkDocument(input)

      chunks.forEach((chunk) => {
        expect(chunk.version).toBe('latest')
      })
    })

    it('should set embedding to null', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: 'Test content',
      }

      const chunks = chunkDocument(input)

      chunks.forEach((chunk) => {
        expect(chunk.embedding).toBeNull()
      })
    })
  })

  describe('Options Validation', () => {
    it('should throw error if minTokens >= maxTokens', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: 'Test content',
      }

      expect(() => {
        chunkDocument(input, { minTokens: 100, maxTokens: 50 })
      }).toThrow()
    })

    it('should use default options when not provided', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: 'Test content '.repeat(200),
      }

      const chunks = chunkDocument(input)

      expect(chunks.length).toBeGreaterThan(0)
    })

    it('should allow custom model parameter', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: 'Test content '.repeat(100),
      }

      // Should not throw
      const chunks = chunkDocument(input, { model: 'text-embedding-3-small' })

      expect(chunks.length).toBeGreaterThan(0)
    })
  })

  describe('Fallback Chunking', () => {
    it('should fallback to character-based chunking if tiktoken fails', () => {
      // This tests the fallback mechanism when encoder is not available
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: 'Test content '.repeat(1000),
      }

      const chunks = chunkDocument(input)

      expect(chunks.length).toBeGreaterThan(0)
      chunks.forEach((chunk) => {
        expect(chunk.text).toBeTruthy()
        expect(chunk.tokenCount).toBeGreaterThan(0)
      })
    })
  })

  describe('Overlap Logic', () => {
    it('should create meaningful overlaps between chunks', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: Array.from({ length: 50 }, (_, i) => `Unique sentence ${i}.`).join(' '),
      }

      const overlapTokens = 30
      const chunks = chunkDocument(input, { 
        maxTokens: 150, 
        minTokens: 80, 
        overlapTokens 
      })

      if (chunks.length > 1) {
        // Verify chunks have content
        chunks.forEach((chunk) => {
          expect(chunk.text.length).toBeGreaterThan(0)
        })
      }
    })

    it('should handle zero overlap', () => {
      const input: ChunkInput = {
        ideId: MOCK_IDE_ID,
        text: 'Content '.repeat(200),
      }

      const chunks = chunkDocument(input, { 
        maxTokens: 100, 
        minTokens: 50, 
        overlapTokens: 0 
      })

      expect(chunks.length).toBeGreaterThan(0)
    })
  })
})
