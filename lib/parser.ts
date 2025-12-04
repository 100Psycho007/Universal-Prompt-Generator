import * as cheerio from 'cheerio'
import TurndownService from 'turndown'

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  hr: '---',
  bulletListMarker: '-'
})

export interface ParsedDocument {
  title: string
  text: string
  section?: string
  metadata: Record<string, any>
}

export interface ParserOptions {
  extractMetadata?: boolean
  cleanWhitespace?: boolean
  preserveCodeBlocks?: boolean
}

export class DocumentParser {
  private options: Required<ParserOptions>

  constructor(options?: ParserOptions) {
    this.options = {
      extractMetadata: options?.extractMetadata ?? true,
      cleanWhitespace: options?.cleanWhitespace ?? true,
      preserveCodeBlocks: options?.preserveCodeBlocks ?? true
    }
  }

  public parseHtml(html: string, url?: string): ParsedDocument {
    const $ = cheerio.load(html)

    $('script, style, nav, header, footer, noscript, iframe').remove()

    const title = this.extractTitle($)
    const section = this.extractSection($)
    const metadata = this.options.extractMetadata ? this.extractMetadata($, url) : {}

    const mainContent = this.extractMainContent($)
    const htmlToConvert = mainContent ?? $('body').html() ?? ''

    let content = turndownService.turndown(htmlToConvert)

    if (!this.options.preserveCodeBlocks) {
      content = content.replace(/```[\s\S]*?```/g, '')
    }

    const text = this.normalizePlainText(content)

    return {
      title,
      text: this.options.cleanWhitespace ? this.cleanText(text) : text,
      section,
      metadata
    }
  }

  public parseMarkdown(markdown: string, url?: string): ParsedDocument {
    const lines = markdown.split('\n')
    const title = this.extractTitleFromMarkdown(lines) || 'Untitled'
    const section = this.extractSectionFromMarkdown(lines)

    const text = this.normalizePlainText(markdown)

    return {
      title,
      text: this.options.cleanWhitespace ? this.cleanText(text) : text,
      section,
      metadata: { url, contentType: 'markdown' }
    }
  }

  public parseText(text: string, url?: string): ParsedDocument {
    const lines = text.split('\n')
    const title = lines[0]?.trim() || 'Untitled'
    const normalized = this.options.cleanWhitespace ? this.cleanText(text) : text

    return {
      title,
      text: normalized,
      metadata: { url, contentType: 'text' }
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    const ogTitle = $('meta[property="og:title"]').attr('content')
    if (ogTitle) return ogTitle.trim()

    const h1 = $('h1').first().text().trim()
    if (h1) return h1

    const title = $('title').text().trim()
    if (title) return title

    return 'Untitled'
  }

  private extractSection($: cheerio.CheerioAPI): string | undefined {
    const breadcrumb = $('.breadcrumb, .breadcrumbs, [class*="breadcrumb"]')
      .last()
      .text()
      .trim()

    if (breadcrumb) {
      const parts = breadcrumb
        .split(/[>\/]/)
        .map((s) => s.trim())
        .filter(Boolean)
      if (parts.length > 0) {
        return parts.join(' > ')
      }
    }

    const h2 = $('h2').first().text().trim()
    if (h2) return h2

    return undefined
  }

  private extractMainContent($: cheerio.CheerioAPI): string | null {
    const selectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '.main-content',
      '#content',
      '#main-content',
      '.documentation',
      '.docs-content',
      '.markdown-body'
    ]

    for (const selector of selectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        return element.html()
      }
    }

    return null
  }

  private extractMetadata($: cheerio.CheerioAPI, url?: string): Record<string, any> {
    const metadata: Record<string, any> = { url }

    const metaTags = $('meta')
    metaTags.each((_, elem) => {
      const name = $(elem).attr('name') || $(elem).attr('property')
      const content = $(elem).attr('content')
      if (name && content) {
        metadata[name] = content
      }
    })

    const canonical = $('link[rel="canonical"]').attr('href')
    if (canonical) {
      metadata.canonical = canonical
    }

    const author = $('meta[name="author"]').attr('content')
    if (author) {
      metadata.author = author
    }

    return metadata
  }

  private extractTitleFromMarkdown(lines: string[]): string | undefined {
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('# ')) {
        return trimmed.slice(2).trim()
      }
    }
    return undefined
  }

  private extractSectionFromMarkdown(lines: string[]): string | undefined {
    let foundH1 = false
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('# ')) {
        foundH1 = true
        continue
      }
      if (foundH1 && trimmed.startsWith('## ')) {
        return trimmed.slice(3).trim()
      }
    }
    return undefined
  }

  private normalizePlainText(markdown: string): string {
    let text = markdown
      .replace(/```[\s\S]*?```/g, (block) =>
        block
          .replace(/```/g, '')
          .split('\n')
          .map((line) => line.trimEnd())
          .join('\n')
      )
      .replace(/`([^`]+)`/g, '$1')
      .replace(/^\s{0,3}[-*+]\s+/gm, '- ')
      .replace(/^\s{0,3}\d+\.\s+/gm, '- ')
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)')
      .replace(/\[(.*?)\]\[(.*?)\]/g, '$1')
      .replace(/\n{3,}/g, '\n\n')

    return text
  }

  private cleanText(text: string): string {
    return text
      .split('\n')
      .map((line) => line.replace(/[\t ]+/g, ' ').trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }
}

export const parseHtml = (html: string, url?: string, options?: ParserOptions): ParsedDocument => {
  const parser = new DocumentParser(options)
  return parser.parseHtml(html, url)
}

export const parseMarkdown = (markdown: string, url?: string, options?: ParserOptions): ParsedDocument => {
  const parser = new DocumentParser(options)
  return parser.parseMarkdown(markdown, url)
}

export const parseText = (text: string, url?: string, options?: ParserOptions): ParsedDocument => {
  const parser = new DocumentParser(options)
  return parser.parseText(text, url)
}

/**
 * Parse a document buffer based on file extension
 */
export async function parseDocument(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop()

  try {
    switch (ext) {
      case 'md':
      case 'markdown':
        const mdContent = buffer.toString('utf-8')
        const mdParsed = parseMarkdown(mdContent)
        return mdParsed.text

      case 'txt':
        const txtContent = buffer.toString('utf-8')
        const txtParsed = parseText(txtContent)
        return txtParsed.text

      case 'html':
      case 'htm':
        const htmlContent = buffer.toString('utf-8')
        const htmlParsed = parseHtml(htmlContent)
        return htmlParsed.text

      case 'pdf':
        // For PDF, we'd need a library like pdf-parse
        // For now, return a placeholder
        return `[PDF content from ${filename} - PDF parsing not yet implemented]`

      case 'docx':
        // For DOCX, we'd need a library like mammoth
        return `[DOCX content from ${filename} - DOCX parsing not yet implemented]`

      case 'epub':
        return `[EPUB content from ${filename} - EPUB parsing not yet implemented]`

      default:
        // Try to parse as text
        const defaultContent = buffer.toString('utf-8')
        return defaultContent
    }
  } catch (error) {
    console.error(`Error parsing ${filename}:`, error)
    throw new Error(`Failed to parse ${filename}`)
  }
}
