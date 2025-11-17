# Prompt Format Detection Engine

A multi-method IDE prompt format detector with fallback to LLM classification.

## Overview

The Prompt Format Detection Engine analyzes IDE documentation to determine the preferred prompt format for generating prompts. It uses seven detection methods in priority order, with LLM fallback for ambiguous cases.

## Detection Methods

### 1. File Extension Hints
- Analyzes file extensions mentioned in documentation
- Looks for `.json`, `.md`, `.xml` file references
- Identifies README files (strong markdown indicator)

### 2. Code Fence Analysis
- Counts language-specific code blocks (```json, ```markdown, ```xml)
- Analyzes generic code fences for plaintext indication

### 3. JSON Schema Detection
- Searches for JSON schema patterns (`{"schema": ...}`)
- Identifies schema keywords (`type`, `properties`, `required`)
- Detects JSON object structures with schema-like keys

### 4. Markdown Structure Analysis
- Counts headings (`#`, `##`, etc.)
- Identifies bullet points and numbered lists
- Detects markdown links and formatting

### 5. CLI Pattern Detection
- Finds command-line patterns (`$ command`)
- Identifies flags and options (`--flag`, `-f`)
- Detects CLI-specific terminology

### 6. Keyword Detection
- Searches for explicit format mentions
- Identifies format-specific terminology

### 7. LLM Classifier Fallback
- Uses OpenRouter API with Claude Haiku model
- Analyzes documentation context when heuristics are unclear
- Provides confidence-based classification

## Output Format

```typescript
interface FormatDetectionResult {
  preferred_format: 'json' | 'markdown' | 'plaintext' | 'cli' | 'xml' | 'custom'
  confidence_score: number        // 0-100
  detection_methods_used: string[] // Methods that agreed
  fallback_formats: Array<{        // Ranked alternatives
    format: PromptFormat
    confidence: number
  }>
}
```

## Usage

### API Endpoint

```bash
POST /api/detectFormat
```

#### Request Body

```typescript
{
  ideId?: string
  ideName?: string
  sampleSize?: number      // Default: 20, Max: 50
  enableLLMFallback?: boolean // Default: true
}
```

#### Response

```typescript
{
  message: string
  data: {
    ideId: string
    ideName: string
    totalChunks: number
    analyzedChunks: number
    formatDetection: FormatDetectionResult
  }
}
```

### Library Usage

```typescript
import { FormatDetector } from '@/lib/format-detector'

const detector = new FormatDetector({
  enableLLMFallback: true,
  minConfidence: 60
})

const result = await detector.detectFormat(ideId, documentation)
console.log(result.preferred_format) // e.g., 'json'
console.log(result.confidence_score) // e.g., 85
```

## Testing

Run the test suite to validate detection accuracy:

```bash
npm run test:format-detector
```

The test includes sample IDEs with known format preferences:
- VS Code → JSON (package.json manifests)
- Cursor → Markdown (documentation structure)
- GitHub Copilot → Plaintext (simple documentation)
- Vim → CLI (command-line interface)
- IntelliJ IDEA → XML (plugin configuration)

## Configuration

### Environment Variables

```bash
# Required for LLM fallback
OPENROUTER_API_KEY=your_api_key
OPENROUTER_APP_URL=https://your-app.com
OPENROUTER_APP_NAME=YourAppName

# Optional: OpenAI fallback
OPENAI_API_KEY=your_openai_key
```

### Detection Options

```typescript
interface FormatDetectorOptions {
  enableLLMFallback?: boolean  // Default: true
  minConfidence?: number      // Default: 60
}
```

## Accuracy Targets

- **Target**: ≥85% accuracy on 20 sample IDEs
- **Current Test Suite**: 5 sample IDEs
- **Methods**: Heuristics + LLM fallback

## Implementation Details

### File Structure

```
lib/
├── format-detector.ts    # Main detection engine
├── llm-classifier.ts     # LLM fallback implementation
pages/api/
└── detectFormat.ts       # API endpoint
scripts/
└── test-format-detector.js # Test suite
```

### Detection Algorithm

1. **Parallel Analysis**: All heuristic methods run simultaneously
2. **Score Aggregation**: Results are combined with weighted scoring
3. **Confidence Check**: If top score < minConfidence, trigger LLM fallback
4. **Final Selection**: Choose highest confidence format with method tracking

### Scoring System

- **File Extensions**: 15-25 points per match
- **Code Fences**: Up to 40 points based on specificity
- **JSON Schemas**: Up to 50 points for strong schema indicators
- **Markdown Structure**: Up to 60 points for rich markdown
- **CLI Patterns**: Up to 60 points for command-line content
- **Keywords**: Up to 30 points for explicit mentions

### Error Handling

- Graceful fallback when LLM is unavailable
- Comprehensive error logging
- Input validation and sanitization
- Rate limiting for API calls

## Performance Considerations

- **Documentation Truncation**: LLM analysis limited to 8000 characters
- **Caching**: Results can be cached per IDE to avoid re-analysis
- **Batch Processing**: Multiple IDEs can be processed in parallel
- **Memory Usage**: Efficient string processing and regex matching

## Future Enhancements

1. **Machine Learning**: Train custom model on IDE documentation
2. **Format Evolution**: Detect when IDEs change preferred formats
3. **User Feedback**: Incorporate user corrections to improve accuracy
4. **Additional Formats**: Support for YAML, TOML, and other formats
5. **Context Awareness**: Consider IDE type and primary language

## Troubleshooting

### Common Issues

1. **Low Confidence Scores**
   - Check documentation quality and completeness
   - Consider adjusting `minConfidence` threshold
   - Verify LLM API key configuration

2. **LLM Fallback Failures**
   - Verify OpenRouter API key is valid
   - Check network connectivity
   - Monitor API rate limits

3. **Inconsistent Results**
   - Ensure documentation samples are representative
   - Consider increasing sample size
   - Review detection method weights

### Debug Mode

Enable detailed logging by setting environment variable:

```bash
DEBUG=format-detector npm run test:format-detector
```