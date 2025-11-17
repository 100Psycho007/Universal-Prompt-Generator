import { Buffer } from 'node:buffer'
import { encoding_for_model, get_encoding, Tiktoken } from 'tiktoken'
import type { DocChunkInsert } from '@/types/database'

export interface ChunkerOptions {
  minTokens?: number
  maxTokens?: number
  overlapTokens?: number
  model?: Parameters<typeof encoding_for_model>[0]
}

export interface ChunkInput {
  ideId: string
  text: string
  sourceUrl?: string | null
  section?: string | null
  version?: string | null
}

export interface ChunkResult extends DocChunkInsert {
  tokenCount: number
  chunkIndex: number
  totalChunks: number
}

const DEFAULT_OPTIONS: Required<ChunkerOptions> = {
  minTokens: 300,
  maxTokens: 1000,
  overlapTokens: 100,
  model: 'text-embedding-3-small'
}

let encoderInstance: Tiktoken | null | undefined

const getEncoder = (): Tiktoken | null => {
  if (encoderInstance !== undefined) {
    return encoderInstance
  }

  try {
    encoderInstance = encoding_for_model(DEFAULT_OPTIONS.model)
  } catch (error) {
    try {
      encoderInstance = get_encoding('cl100k_base')
    } catch (fallbackError) {
      console.warn('Chunker: failed to initialize tiktoken encoder', error, fallbackError)
      encoderInstance = null
    }
  }

  return encoderInstance ?? null
}

interface Section {
  title: string | null
  content: string
}

const HEADING_REGEX = /^#{1,6}\s+.+$/

const splitIntoSections = (text: string, fallbackTitle: string | null): Section[] => {
  const lines = text.split('\n')
  const sections: Section[] = []

  let currentTitle: string | null = fallbackTitle ?? null
  let buffer: string[] = []

  const pushSection = () => {
    const content = buffer.join('\n').trim()
    if (content.length === 0) {
      buffer = []
      return
    }

    sections.push({
      title: currentTitle,
      content
    })

    buffer = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (HEADING_REGEX.test(line)) {
      if (buffer.length > 0) {
        pushSection()
      }
      currentTitle = line.replace(/^#{1,6}\s*/, '').trim() || currentTitle
    }

    buffer.push(rawLine)
  }

  if (buffer.length > 0) {
    pushSection()
  }

  if (sections.length === 0) {
    const cleaned = text.trim()
    if (cleaned.length > 0) {
      sections.push({
        title: fallbackTitle,
        content: cleaned
      })
    }
  }

  return sections
}

const decodeTokens = (encoder: Tiktoken, tokens: number[]): string => {
  const uintArray = new Uint32Array(tokens)
  const decoded = encoder.decode(uintArray)
  return Buffer.from(decoded).toString('utf8').trim()
}

const fallbackChunk = (input: ChunkInput, options: Required<ChunkerOptions>): ChunkResult[] => {
  const approxMinChars = options.minTokens * 4
  const approxMaxChars = options.maxTokens * 4
  const approxOverlapChars = options.overlapTokens * 4

  const sections = splitIntoSections(input.text, input.section ?? null)
  const chunks: ChunkResult[] = []

  let chunkIndex = 0

  for (const section of sections) {
    const content = section.content
    let start = 0
    while (start < content.length) {
      const maxEnd = Math.min(start + approxMaxChars, content.length)
      const chunkText = content.slice(start, maxEnd).trim()
      if (chunkText.length === 0) {
        break
      }

      chunks.push({
        ide_id: input.ideId,
        text: chunkText,
        source_url: input.sourceUrl ?? null,
        section: section.title ?? input.section ?? null,
        version: input.version ?? 'latest',
        embedding: null,
        tokenCount: Math.max(Math.round(chunkText.length / 4), 1),
        chunkIndex: chunkIndex++,
        totalChunks: 0
      })

      if (maxEnd >= content.length) {
        break
      }

      start = Math.max(maxEnd - approxOverlapChars, start + 1)
    }
  }

  const totalChunks = chunks.length
  return chunks.map((chunk) => ({ ...chunk, totalChunks }))
}

export const chunkDocument = (
  input: ChunkInput,
  options?: ChunkerOptions
): ChunkResult[] => {
  const resolved: Required<ChunkerOptions> = {
    minTokens: options?.minTokens ?? DEFAULT_OPTIONS.minTokens,
    maxTokens: options?.maxTokens ?? DEFAULT_OPTIONS.maxTokens,
    overlapTokens: options?.overlapTokens ?? DEFAULT_OPTIONS.overlapTokens,
    model: options?.model ?? DEFAULT_OPTIONS.model
  }

  if (resolved.minTokens >= resolved.maxTokens) {
    throw new Error('chunkDocument: minTokens must be less than maxTokens')
  }

  const encoder = getEncoder()
  if (!encoder) {
    return fallbackChunk(input, resolved)
  }

  const sections = splitIntoSections(input.text, input.section ?? null)
  const chunks: ChunkResult[] = []
  let chunkIndex = 0

  for (const section of sections) {
    const tokens = Array.from(encoder.encode(section.content))
    if (tokens.length === 0) {
      continue
    }

    let start = 0
    while (start < tokens.length) {
      let end = Math.min(start + resolved.maxTokens, tokens.length)
      let chunkTokens = tokens.slice(start, end)

      if (chunkTokens.length < resolved.minTokens && end < tokens.length) {
        const additional = resolved.minTokens - chunkTokens.length
        end = Math.min(end + additional, tokens.length)
        chunkTokens = tokens.slice(start, end)
      }

      if (end >= tokens.length && chunkTokens.length < resolved.minTokens && chunks.length > 0) {
        const overlap = Math.min(resolved.overlapTokens, chunkTokens.length)
        const uniqueTokens = chunkTokens.slice(overlap)
        if (uniqueTokens.length > 0) {
          const uniqueText = decodeTokens(encoder, uniqueTokens)
          const lastChunk = chunks[chunks.length - 1]
          lastChunk.text = `${lastChunk.text}\n\n${uniqueText}`.trim()
          lastChunk.tokenCount += uniqueTokens.length
        }
        break
      }

      const chunkText = decodeTokens(encoder, chunkTokens)

      if (chunkText.length === 0) {
        break
      }

      chunks.push({
        ide_id: input.ideId,
        text: chunkText,
        source_url: input.sourceUrl ?? null,
        section: section.title ?? input.section ?? null,
        version: input.version ?? 'latest',
        embedding: null,
        tokenCount: chunkTokens.length,
        chunkIndex: chunkIndex++,
        totalChunks: 0
      })

      if (end >= tokens.length) {
        break
      }

      const nextStart = end - resolved.overlapTokens
      start = Math.max(nextStart, start + 1)
    }
  }

  const totalChunks = chunks.length

  return chunks.map((chunk) => ({
    ...chunk,
    totalChunks
  }))
}

export const estimateTokenCount = (text: string): number => {
  const encoder = getEncoder()
  if (!encoder) {
    return Math.max(Math.round(text.length / 4), 1)
  }

  const tokens = encoder.encode(text)
  return tokens.length
}

export const clearChunkerCache = () => {
  encoderInstance = undefined
}
