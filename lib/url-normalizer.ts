const DEFAULT_BLOCKED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp',
  '.pdf', '.zip', '.tar', '.gz', '.tgz', '.rar', '.7z', '.mp4', '.mp3', '.mov',
  '.avi', '.wmv', '.flv', '.mkv', '.exe', '.dmg', '.iso', '.apk', '.msi'
]

const DEFAULT_ALLOWED_PROTOCOLS = ['http:', 'https:']

export interface SanitizedUrl {
  url: string
  hostname: string
  pathname: string
  pathnameSegments: string[]
}

export interface UrlNormalizerOptions {
  allowedHosts?: string[]
  blockedExtensions?: string[]
  sameOriginOnly?: boolean
  removeQueryParams?: boolean
}

export class URLNormalizer {
  private readonly rootHost?: string
  private readonly options: Required<UrlNormalizerOptions>
  private readonly seen = new Set<string>()

  constructor(rootUrl?: string, options?: UrlNormalizerOptions) {
    this.rootHost = rootUrl ? this.safeParse(rootUrl)?.hostname : undefined
    this.options = {
      allowedHosts: options?.allowedHosts ?? (this.rootHost ? [this.rootHost] : []),
      blockedExtensions: options?.blockedExtensions ?? DEFAULT_BLOCKED_EXTENSIONS,
      sameOriginOnly: options?.sameOriginOnly ?? true,
      removeQueryParams: options?.removeQueryParams ?? false
    }
  }

  public sanitize(rawUrl: string, baseUrl?: string): SanitizedUrl | null {
    const resolved = this.safeParse(rawUrl, baseUrl)
    if (!resolved) return null

    if (!DEFAULT_ALLOWED_PROTOCOLS.includes(resolved.protocol)) return null
    if (this.options.sameOriginOnly && this.rootHost && resolved.hostname !== this.rootHost) {
      return null
    }

    if (
      this.options.allowedHosts.length > 0 &&
      !this.options.allowedHosts.includes(resolved.hostname)
    ) {
      return null
    }

    if (this.isBlockedExtension(resolved.pathname)) {
      return null
    }

    resolved.hash = ''

    if (this.options.removeQueryParams) {
      resolved.search = ''
    }

    if (resolved.pathname !== '/' && resolved.pathname.endsWith('/')) {
      resolved.pathname = resolved.pathname.slice(0, -1)
    }

    const normalizedUrl = resolved.toString()
    const pathnameSegments = resolved.pathname
      .split('/')
      .filter(Boolean)

    return {
      url: normalizedUrl,
      hostname: resolved.hostname,
      pathname: resolved.pathname,
      pathnameSegments
    }
  }

  public hasSeen(url: string) {
    return this.seen.has(url)
  }

  public markSeen(url: string) {
    this.seen.add(url)
  }

  public dedupe(urls: string[], baseUrl?: string) {
    const unique: string[] = []
    for (const candidate of urls) {
      const sanitized = this.sanitize(candidate, baseUrl)
      if (!sanitized) continue
      if (this.hasSeen(sanitized.url)) continue
      this.markSeen(sanitized.url)
      unique.push(sanitized.url)
    }
    return unique
  }

  private safeParse(rawUrl: string, baseUrl?: string) {
    try {
      return baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl)
    } catch (error) {
      return null
    }
  }

  private isBlockedExtension(pathname: string) {
    const lowerCasePathname = pathname.toLowerCase()
    return this.options.blockedExtensions.some((ext) => lowerCasePathname.endsWith(ext))
  }
}

export const normalizeUrls = (
  urls: string[],
  baseUrl?: string,
  options?: UrlNormalizerOptions
) => {
  const normalizer = new URLNormalizer(baseUrl, options)
  return normalizer.dedupe(urls, baseUrl)
}
