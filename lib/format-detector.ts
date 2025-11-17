export type PromptFormat = 'json' | 'markdown' | 'plaintext' | 'cli' | 'xml' | 'custom'

export interface FormatDetectionResult {
  preferred_format: PromptFormat
  confidence_score: number
  detection_methods_used: string[]
  fallback_formats: Array<{ format: PromptFormat; confidence: number }>
}

export interface FormatDetectorOptions {
  enableLLMFallback?: boolean
  minConfidence?: number
}

interface FormatScore {
  format: PromptFormat
  score: number
  methods: string[]
}

export class FormatDetector {
  private readonly options: Required<FormatDetectorOptions>

  constructor(options?: FormatDetectorOptions) {
    this.options = {
      enableLLMFallback: options?.enableLLMFallback ?? true,
      minConfidence: options?.minConfidence ?? 60
    }
  }

  public async detectFormat(ideId: string, documentation: string): Promise<FormatDetectionResult> {
    const scores: FormatScore[] = []

    // Method 1: File extension hints
    const extensionScore = this.analyzeFileExtensions(documentation)
    scores.push(extensionScore)

    // Method 2: Code fence analysis
    const codeFenceScore = this.analyzeCodeFences(documentation)
    scores.push(codeFenceScore)

    // Method 3: JSON schema detection
    const jsonSchemaScore = this.analyzeJsonSchemas(documentation)
    scores.push(jsonSchemaScore)

    // Method 4: Markdown structure analysis
    const markdownScore = this.analyzeMarkdownStructure(documentation)
    scores.push(markdownScore)

    // Method 5: CLI pattern detection
    const cliScore = this.analyzeCliPatterns(documentation)
    scores.push(cliScore)

    // Method 6: Keyword detection
    const keywordScore = this.analyzeKeywords(documentation)
    scores.push(keywordScore)

    // Aggregate scores
    const aggregatedScores = this.aggregateScores(scores)

    // Sort by confidence
    const sortedFormats = aggregatedScores
      .sort((a, b) => b.score - a.score)
      .filter(score => score.score > 0)

    if (sortedFormats.length === 0) {
      return this.getDefaultResult()
    }

    const topFormat = sortedFormats[0]
    
    // If confidence is low and LLM fallback is enabled, use LLM classifier
    if (topFormat.score < this.options.minConfidence && this.options.enableLLMFallback) {
      try {
        const llmResult = await this.classifyWithLLM(ideId, documentation)
        if (llmResult.confidence_score > topFormat.score) {
          return llmResult
        }
      } catch (error) {
        console.warn('LLM classification failed, using heuristic results:', error)
      }
    }

    return {
      preferred_format: topFormat.format,
      confidence_score: Math.min(topFormat.score, 100),
      detection_methods_used: topFormat.methods,
      fallback_formats: sortedFormats.slice(1, 4).map(item => ({
        format: item.format,
        confidence: Math.min(item.score, 100)
      }))
    }
  }

  private analyzeFileExtensions(documentation: string): FormatScore {
    const text = documentation.toLowerCase()
    const methods: string[] = []
    let jsonScore = 0
    let markdownScore = 0
    let xmlScore = 0

    // Check for file extensions and examples
    if (text.includes('.json') || text.includes('json file') || text.includes('package.json')) {
      jsonScore += 25
      methods.push('json-file-extension')
    }

    if (text.includes('.md') || text.includes('readme.md') || text.includes('markdown file')) {
      markdownScore += 25
      methods.push('markdown-file-extension')
    }

    if (text.includes('.xml') || text.includes('xml file') || text.includes('pom.xml')) {
      xmlScore += 25
      methods.push('xml-file-extension')
    }

    // README files strongly suggest markdown
    if (text.includes('readme') || text.includes('read-me')) {
      markdownScore += 15
      methods.push('readme-hint')
    }

    const scores = [
      { format: 'json' as PromptFormat, score: jsonScore },
      { format: 'markdown' as PromptFormat, score: markdownScore },
      { format: 'xml' as PromptFormat, score: xmlScore }
    ]

    const topScore = scores.sort((a, b) => b.score - a.score)[0]
    return {
      format: topScore.format,
      score: topScore.score,
      methods
    }
  }

  private analyzeCodeFences(documentation: string): FormatScore {
    const jsonFenceMatches = (documentation.match(/```json/gi) || []).length
    const markdownFenceMatches = (documentation.match(/```markdown/gi) || []).length
    const xmlFenceMatches = (documentation.match(/```xml/gi) || []).length
    const totalFences = (documentation.match(/```/g) || []).length / 2

    if (totalFences === 0) {
      return { format: 'plaintext', score: 0, methods: [] }
    }

    const methods: string[] = []
    let jsonScore = 0
    let markdownScore = 0
    let xmlScore = 0
    let plaintextScore = 0

    if (jsonFenceMatches > 0) {
      jsonScore = (jsonFenceMatches / totalFences) * 40
      methods.push('json-code-fence')
    }

    if (markdownFenceMatches > 0) {
      markdownScore = (markdownFenceMatches / totalFences) * 40
      methods.push('markdown-code-fence')
    }

    if (xmlFenceMatches > 0) {
      xmlScore = (xmlFenceMatches / totalFences) * 40
      methods.push('xml-code-fence')
    }

    // If no specific language fences, default to plaintext
    if (jsonFenceMatches === 0 && markdownFenceMatches === 0 && xmlFenceMatches === 0) {
      plaintextScore = 20
      methods.push('generic-code-fence')
    }

    const scores = [
      { format: 'json' as PromptFormat, score: jsonScore },
      { format: 'markdown' as PromptFormat, score: markdownScore },
      { format: 'xml' as PromptFormat, score: xmlScore },
      { format: 'plaintext' as PromptFormat, score: plaintextScore }
    ]

    const topScore = scores.sort((a, b) => b.score - a.score)[0]
    return {
      format: topScore.format,
      score: topScore.score,
      methods
    }
  }

  private analyzeJsonSchemas(documentation: string): FormatScore {
    const text = documentation.toLowerCase()
    const methods: string[] = []
    let score = 0

    // Look for JSON schema patterns
    if (text.includes('"schema"') || text.includes('json schema') || text.includes('jsonschema')) {
      score += 35
      methods.push('json-schema-keyword')
    }

    // Look for JSON object patterns with specific keys
    const jsonPattern = /\{[^}]*"(type|properties|required|additionalProperties)"[^}]*\}/g
    const matches = documentation.match(jsonPattern)
    if (matches && matches.length > 0) {
      score += Math.min(matches.length * 10, 30)
      methods.push('json-schema-pattern')
    }

    // Look for common JSON schema keywords
    const schemaKeywords = ['"type":', '"properties":', '"required":', '"items":', '"$schema"']
    const keywordMatches = schemaKeywords.filter(keyword => text.includes(keyword))
    if (keywordMatches.length > 0) {
      score += keywordMatches.length * 5
      methods.push('json-schema-keywords')
    }

    return {
      format: 'json',
      score: Math.min(score, 50),
      methods
    }
  }

  private analyzeMarkdownStructure(documentation: string): FormatScore {
    const methods: string[] = []
    let score = 0

    // Count headings
    const headingMatches = documentation.match(/^#{1,6}\s/gm) || []
    if (headingMatches.length > 0) {
      score += Math.min(headingMatches.length * 3, 25)
      methods.push('markdown-headings')
    }

    // Count bullet points
    const bulletMatches = documentation.match(/^[-*+]\s/gm) || []
    if (bulletMatches.length > 0) {
      score += Math.min(bulletMatches.length * 2, 20)
      methods.push('markdown-bullets')
    }

    // Count numbered lists
    const numberedMatches = documentation.match(/^\d+\.\s/gm) || []
    if (numberedMatches.length > 0) {
      score += Math.min(numberedMatches.length * 2, 15)
      methods.push('markdown-numbered-lists')
    }

    // Look for markdown links
    const linkMatches = documentation.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []
    if (linkMatches.length > 0) {
      score += Math.min(linkMatches.length * 2, 15)
      methods.push('markdown-links')
    }

    // Look for bold/italic
    const boldMatches = documentation.match(/\*\*[^*]+\*\*/g) || []
    const italicMatches = documentation.match(/\*[^*]+\*/g) || []
    if (boldMatches.length > 0 || italicMatches.length > 0) {
      score += Math.min((boldMatches.length + italicMatches.length) * 1, 10)
      methods.push('markdown-formatting')
    }

    return {
      format: 'markdown',
      score: Math.min(score, 60),
      methods
    }
  }

  private analyzeCliPatterns(documentation: string): FormatScore {
    const text = documentation.toLowerCase()
    const methods: string[] = []
    let score = 0

    // Look for command line patterns
    const commandPattern = /\$[\s]*[a-z][a-z0-9_-]*[\s]*[a-z0-9_-]/gim
    const commandMatches = documentation.match(commandPattern) || []
    if (commandMatches.length > 0) {
      score += Math.min(commandMatches.length * 8, 30)
      methods.push('cli-dollar-commands')
    }

    // Look for flag patterns
    const flagPattern = /(--[a-z][a-z0-9_-]+|-[a-z])/g
    const flagMatches = documentation.match(flagPattern) || []
    if (flagMatches.length > 0) {
      score += Math.min(flagMatches.length * 3, 25)
      methods.push('cli-flags')
    }

    // Look for CLI-specific keywords
    const cliKeywords = ['command', 'flag', 'option', 'usage', 'syntax', 'arguments']
    const keywordMatches = cliKeywords.filter(keyword => text.includes(keyword))
    if (keywordMatches.length > 0) {
      score += keywordMatches.length * 4
      methods.push('cli-keywords')
    }

    // Look for man page patterns
    if (text.includes('usage:') || text.includes('options:') || text.includes('examples:')) {
      score += 15
      methods.push('cli-man-page')
    }

    return {
      format: 'cli',
      score: Math.min(score, 60),
      methods
    }
  }

  private analyzeKeywords(documentation: string): FormatScore {
    const text = documentation.toLowerCase()
    const methods: string[] = []
    const scores: Array<{ format: PromptFormat; score: number }> = []

    // JSON keywords
    const jsonKeywords = ['json', 'json format', 'json object', 'json array']
    const jsonMatches = jsonKeywords.filter(keyword => text.includes(keyword))
    if (jsonMatches.length > 0) {
      scores.push({ format: 'json', score: jsonMatches.length * 6 })
      methods.push('json-keywords')
    }

    // Markdown keywords
    const markdownKeywords = ['markdown', 'md format', 'markdown syntax']
    const markdownMatches = markdownKeywords.filter(keyword => text.includes(keyword))
    if (markdownMatches.length > 0) {
      scores.push({ format: 'markdown', score: markdownMatches.length * 6 })
      methods.push('markdown-keywords')
    }

    // XML keywords
    const xmlKeywords = ['xml', 'xml format', 'xml element', 'xml tag']
    const xmlMatches = xmlKeywords.filter(keyword => text.includes(keyword))
    if (xmlMatches.length > 0) {
      scores.push({ format: 'xml', score: xmlMatches.length * 6 })
      methods.push('xml-keywords')
    }

    // CLI keywords
    const cliKeywords = ['command line', 'cli', 'terminal', 'shell', 'bash']
    const cliMatches = cliKeywords.filter(keyword => text.includes(keyword))
    if (cliMatches.length > 0) {
      scores.push({ format: 'cli', score: cliMatches.length * 6 })
      methods.push('cli-keywords')
    }

    // Plain text keywords
    const plaintextKeywords = ['plain text', 'text format', 'text file']
    const plaintextMatches = plaintextKeywords.filter(keyword => text.includes(keyword))
    if (plaintextMatches.length > 0) {
      scores.push({ format: 'plaintext', score: plaintextMatches.length * 6 })
      methods.push('plaintext-keywords')
    }

    if (scores.length === 0) {
      return { format: 'plaintext', score: 0, methods: [] }
    }

    const topScore = scores.sort((a, b) => b.score - a.score)[0]
    return {
      format: topScore.format,
      score: Math.min(topScore.score, 30),
      methods
    }
  }

  private aggregateScores(scores: FormatScore[]): FormatScore[] {
    const formatMap = new Map<PromptFormat, { score: number; methods: Set<string> }>()

    for (const score of scores) {
      if (score.score === 0) continue

      const existing = formatMap.get(score.format) || { score: 0, methods: new Set() }
      existing.score += score.score
      score.methods.forEach(method => existing.methods.add(method))
      formatMap.set(score.format, existing)
    }

    return Array.from(formatMap.entries()).map(([format, data]) => ({
      format,
      score: data.score,
      methods: Array.from(data.methods)
    }))
  }

  private getDefaultResult(): FormatDetectionResult {
    return {
      preferred_format: 'plaintext',
      confidence_score: 20,
      detection_methods_used: ['default'],
      fallback_formats: []
    }
  }

  private async classifyWithLLM(ideId: string, documentation: string): Promise<FormatDetectionResult> {
    // This will be implemented in the LLM classifier
    // For now, return a fallback result
    const { LLMClassifier } = await import('./llm-classifier')
    const classifier = new LLMClassifier()
    return classifier.classifyFormat(ideId, documentation)
  }
}

export const defaultFormatDetector = new FormatDetector()