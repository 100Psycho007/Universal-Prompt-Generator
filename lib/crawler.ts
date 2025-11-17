import robotsParser from 'robots-parser'
import { URLNormalizer } from './url-normalizer'
import { DocumentParser, ParsedDocument } from './parser'
import { DocChunkManager } from './db-utils'
import { chunkDocument } from './chunker'
import type { DocChunkInsert } from '../types/database'
import * as cheerio from 'cheerio'

const NON_DOC_URL_PATTERNS = [
  /\/blog\//i,
  /\/pricing/i,
  /\/changelog/i,
  /\/news/i,
  /\/press/i,
  /\/legal/i,
  /\/terms/i,
  /\/privacy/i,
  /\.(?:png|jpg|jpeg|gif|svg|webp|ico)$/i
]

const SUPPORTED_CONTENT_TYPES = [
  'text/html',
  'text/plain',
  'text/markdown',
  'application/xhtml+xml'
]

export interface CrawlOptions {
  maxDepth?: number
  maxPages?: number
  rateLimit?: number
  respectRobotsTxt?: boolean
  allowedPatterns?: RegExp[]
  userAgent?: string
  timeout?: number
  retryAttempts?: number
  exponentialBackoff?: boolean
  maxContentLengthBytes?: number
}

export interface CrawlResult {
  url: string
  success: boolean
  title?: string
  textSample?: string
  section?: string
  version?: string
  chunkCount?: number
  error?: string
  statusCode?: number
  contentType?: string
}

export interface CrawlStats {
  startTime: Date
  endTime?: Date
  totalPages: number
  successfulPages: number
  failedPages: number
  skippedPages: number
  totalBytes: number
  storedChunks: number
  errors: Array<{ url: string; error: string }>
}

export class DocumentCrawler {
  private options: Required<CrawlOptions>
  private readonly urlNormalizer: URLNormalizer
  private readonly parser: DocumentParser
  private readonly robotsCache = new Map<string, ReturnType<typeof robotsParser> | null>()
  private readonly crawlDelays = new Map<string, number>()
  private readonly lastRequestPerHost = new Map<string, number>()
  private stats: CrawlStats
  private queue: Array<{ url: string; depth: number }> = []
  private processed = new Set<string>()

  constructor(rootUrl: string, options?: CrawlOptions) {
    this.urlNormalizer = new URLNormalizer(rootUrl, { sameOriginOnly: true })
    this.parser = new DocumentParser()
    this.options = {
      maxDepth: options?.maxDepth ?? 3,
      maxPages: options?.maxPages ?? 150,
      rateLimit: options?.rateLimit ?? 750,
      respectRobotsTxt: options?.respectRobotsTxt ?? true,
      allowedPatterns: options?.allowedPatterns ?? [],
      userAgent: options?.userAgent ?? 'UniversalIDE-Crawler/1.0',
      timeout: options?.timeout ?? 15000,
      retryAttempts: options?.retryAttempts ?? 3,
      exponentialBackoff: options?.exponentialBackoff ?? true,
      maxContentLengthBytes: options?.maxContentLengthBytes ?? 2 * 1024 * 1024 // 2 MB
    }
    this.stats = {
      startTime: new Date(),
      totalPages: 0,
      successfulPages: 0,
      failedPages: 0,
      skippedPages: 0,
      totalBytes: 0,
      storedChunks: 0,
      errors: []
    }
  }

  public async crawl(seedUrls: string[], ideId: string, version?: string): Promise<CrawlStats> {
    this.stats.startTime = new Date()

    for (const seedUrl of seedUrls) {
      const sanitized = this.urlNormalizer.sanitize(seedUrl)
      if (sanitized) {
        this.queue.push({ url: sanitized.url, depth: 0 })
        this.urlNormalizer.markSeen(sanitized.url)
      }
    }

    while (this.queue.length > 0 && this.stats.totalPages < this.options.maxPages) {
      const current = this.queue.shift()
      if (!current) break

      if (this.processed.has(current.url)) continue
      this.processed.add(current.url)

      await this.crawlPage(current.url, current.depth, ideId, version)
    }

    this.stats.endTime = new Date()
    return this.stats
  }

  private async crawlPage(
    url: string,
    depth: number,
    ideId: string,
    version?: string
  ): Promise<CrawlResult> {
    this.stats.totalPages++

    if (this.isNonDocumentationUrl(url)) {
      this.stats.skippedPages++
      return { url, success: false, error: 'Non-documentation URL skipped' }
    }

    if (this.options.respectRobotsTxt) {
      const allowed = await this.isAllowedByRobots(url)
      if (!allowed) {
        this.stats.failedPages++
        const error = 'Blocked by robots.txt'
        this.stats.errors.push({ url, error })
        return { url, success: false, error }
      }
    }

    try {
      const response = await this.fetchWithRetry(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentLengthHeader = response.headers.get('content-length')
      const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null
      if (contentLength && contentLength > this.options.maxContentLengthBytes) {
        this.stats.skippedPages++
        return { url, success: false, error: 'Content too large to process' }
      }

      const contentType = response.headers.get('content-type') || ''
      if (!this.isSupportedContentType(contentType, url)) {
        this.stats.skippedPages++
        return { url, success: false, error: `Unsupported content type: ${contentType}` }
      }

      const rawContent = await response.text()
      this.stats.totalBytes += rawContent.length

      const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml')
      const isMarkdown = contentType.includes('text/markdown') || /\.m(?:d|arkdown)$/i.test(url)
      const isText = contentType.includes('text/plain') || url.toLowerCase().endsWith('.txt')

      let parsed: ParsedDocument
      if (isHtml) {
        parsed = this.parser.parseHtml(rawContent, url)
      } else if (isMarkdown) {
        parsed = this.parser.parseMarkdown(rawContent, url)
      } else {
        parsed = this.parser.parseText(rawContent, url)
      }

      const contentText = parsed.text.trim()
      if (contentText.length < 100) {
        this.stats.skippedPages++
        return { url, success: false, error: 'Content too short to store' }
      }

      const detectedVersion = version || this.detectVersion(url, parsed, rawContent)

      const chunkResults = chunkDocument({
        ideId,
        text: contentText,
        sourceUrl: url,
        section: parsed.section || parsed.title,
        version: detectedVersion
      })

      if (chunkResults.length === 0) {
        this.stats.skippedPages++
        return { url, success: false, error: 'No chunks generated from content' }
      }

      const chunkPayload: DocChunkInsert[] = chunkResults.map(({ ide_id, text, source_url, section, version: chunkVersion }) => ({
        ide_id,
        text,
        source_url,
        section,
        version: chunkVersion
      }))

      const { error: insertError } = await DocChunkManager.bulkCreateDocChunks(chunkPayload)
      if (insertError) {
        throw new Error(insertError.message || 'Failed to store document chunks')
      }

      this.stats.storedChunks += chunkPayload.length
      this.stats.successfulPages++

      if (depth < this.options.maxDepth && isHtml) {
        const links = this.extractLinks(rawContent, url)
        const filteredLinks = this.filterLinks(links)

        for (const link of filteredLinks) {
          if (!this.processed.has(link) && !this.urlNormalizer.hasSeen(link)) {
            this.queue.push({ url: link, depth: depth + 1 })
            this.urlNormalizer.markSeen(link)
          }
        }
      }

      return {
        url,
        success: true,
        title: parsed.title,
        textSample: this.sampleText(chunkPayload[0]?.text ?? contentText),
        section: parsed.section,
        version: detectedVersion,
        chunkCount: chunkPayload.length,
        statusCode: response.status,
        contentType
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.stats.failedPages++
      this.stats.errors.push({ url, error: errorMessage })

      return {
        url,
        success: false,
        error: errorMessage
      }
    }
  }

  private async fetchWithRetry(url: string): Promise<Response> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.options.retryAttempts; attempt++) {
      try {
        await this.waitForTurn(url)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout)

        const response = await fetch(url, {
          headers: {
            'User-Agent': this.options.userAgent,
            Accept: SUPPORTED_CONTENT_TYPES.join(',')
          },
          signal: controller.signal
        })

        clearTimeout(timeoutId)
        return response
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown fetch error')

        if (attempt < this.options.retryAttempts - 1) {
          const baseDelay = this.options.exponentialBackoff ? Math.pow(2, attempt) * 1000 : 1000
          const jitter = Math.random() * 300
          await this.sleep(baseDelay + jitter)
        }
      }
    }

    throw lastError || new Error('Fetch failed after retries')
  }

  private async waitForTurn(url: string) {
    const { host } = new URL(url)
    const lastRequest = this.lastRequestPerHost.get(host) ?? 0
    const crawlDelay = this.crawlDelays.get(host) ?? 0
    const baseDelay = Math.max(this.options.rateLimit, crawlDelay)
    const jitter = Math.random() * Math.max(250, baseDelay / 2)

    const earliestNextRequest = lastRequest + baseDelay + jitter
    const now = Date.now()
    const waitTime = Math.max(0, earliestNextRequest - now)

    if (waitTime > 0) {
      await this.sleep(waitTime)
    }

    this.lastRequestPerHost.set(host, Date.now())
  }

  private async isAllowedByRobots(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url)
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`

      if (!this.robotsCache.has(robotsUrl)) {
        let robots: ReturnType<typeof robotsParser> | null = null

        try {
          const response = await fetch(robotsUrl, {
            headers: { 'User-Agent': this.options.userAgent }
          })

          if (response.ok) {
            const robotsTxt = await response.text()
            robots = robotsParser(robotsUrl, robotsTxt)

            const crawlDelay =
              robots.getCrawlDelay(this.options.userAgent) ?? robots.getCrawlDelay('*')
            if (typeof crawlDelay === 'number' && crawlDelay > 0) {
              this.crawlDelays.set(urlObj.host, crawlDelay * 1000)
            }
          }
        } catch {
          robots = null
        }

        this.robotsCache.set(robotsUrl, robots)
      }

      const robots = this.robotsCache.get(robotsUrl)
      if (!robots) return true

      return robots.isAllowed(url, this.options.userAgent) ?? true
    } catch {
      return true
    }
  }

  private extractLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html)
    const links: string[] = []

    $('a[href]').each((_, elem) => {
      const href = $(elem).attr('href')
      if (!href) return

      const sanitized = this.urlNormalizer.sanitize(href, baseUrl)
      if (!sanitized) return

      if (this.isNonDocumentationUrl(sanitized.url)) return

      links.push(sanitized.url)
    })

    return links
  }

  private filterLinks(links: string[]): string[] {
    if (this.options.allowedPatterns.length === 0) {
      return links
    }

    return links.filter((link) =>
      this.options.allowedPatterns.some((pattern) => pattern.test(link))
    )
  }

  private detectVersion(url: string, parsed: ParsedDocument, content: string): string {
    const versionFromUrl = this.extractVersionFromUrl(url)
    if (versionFromUrl) return versionFromUrl

    const combinedText = `${parsed.title}\n${parsed.section ?? ''}\n${content.slice(0, 2000)}`
    const versionFromContent = this.extractVersionFromText(combinedText)
    if (versionFromContent) return versionFromContent

    return 'latest'
  }

  private extractVersionFromUrl(url: string): string | null {
    const lowerUrl = url.toLowerCase()
    const segments = new URL(url).pathname.split('/').filter(Boolean)

    for (const segment of segments) {
      const match = segment.match(/^v(?:ersion)?[-_]?([0-9]+(?:\.[0-9]+){0,2})$/i)
      if (match) {
        return match[1]
      }
      const simpleMatch = segment.match(/^([0-9]+(?:\.[0-9]+){1,2})$/)
      if (simpleMatch) {
        return simpleMatch[1]
      }
    }

    const queryMatch = lowerUrl.match(/version=([0-9]+(?:\.[0-9]+){0,2})/)
    if (queryMatch) {
      return queryMatch[1]
    }

    return null
  }

  private extractVersionFromText(text: string): string | null {
    const patterns = [
      /version\s*(?:release\s*)?[:\-]?\s*v?(\d+(?:\.\d+){0,2})/i,
      /release\s*v?(\d+(?:\.\d+){0,2})/i,
      /v(\d+(?:\.\d+){0,2})\b/,
      /\b(\d+\.\d+\.\d+)\b/
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        const candidate = match[1]
        if (!this.isLikelyYear(candidate)) {
          return candidate
        }
      }
    }

    return null
  }

  private isLikelyYear(value: string): boolean {
    const numeric = Number(value)
    return numeric >= 2000 && numeric <= 2099
  }

  private isSupportedContentType(contentType: string, url: string): boolean {
    if (!contentType) {
      return SUPPORTED_CONTENT_TYPES.some((type) => type === 'text/plain')
    }

    return SUPPORTED_CONTENT_TYPES.some((type) => contentType.includes(type)) ||
      /\.m(?:d|arkdown)$/i.test(url) ||
      url.toLowerCase().endsWith('.txt')
  }

  private isNonDocumentationUrl(url: string): boolean {
    return NON_DOC_URL_PATTERNS.some((pattern) => pattern.test(url))
  }

  private sampleText(text: string, length = 160) {
    return text.length > length ? `${text.slice(0, length)}…` : text
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  public getStats(): CrawlStats {
    return { ...this.stats }
  }
}

export const crawlDocumentation = async (
  rootUrl: string,
  seedUrls: string[],
  ideId: string,
  version?: string,
  options?: CrawlOptions
): Promise<CrawlStats> => {
  const crawler = new DocumentCrawler(rootUrl, options)
  return crawler.crawl(seedUrls, ideId, version)
}
