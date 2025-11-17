# Prompt Format Detection API Examples

## Usage Examples

### 1. Basic Format Detection

```bash
curl -X POST http://localhost:3000/api/detectFormat \
  -H "Content-Type: application/json" \
  -d '{
    "ideName": "vscode",
    "sampleSize": 20,
    "enableLLMFallback": true
  }'
```

**Response:**
```json
{
  "message": "Format detection completed",
  "data": {
    "ideId": "vscode-id",
    "ideName": "Visual Studio Code",
    "totalChunks": 150,
    "analyzedChunks": 20,
    "formatDetection": {
      "preferred_format": "json",
      "confidence_score": 92,
      "detection_methods_used": [
        "json-file-extension",
        "json-code-fence",
        "json-schema-pattern"
      ],
      "fallback_formats": [
        {"format": "markdown", "confidence": 45},
        {"format": "plaintext", "confidence": 20}
      ]
    }
  }
}
```

### 2. Detect by IDE ID

```bash
curl -X POST http://localhost:3000/api/detectFormat \
  -H "Content-Type: application/json" \
  -d '{
    "ideId": "cursor-editor-id",
    "sampleSize": 30,
    "enableLLMFallback": false
  }'
```

### 3. Minimal Request

```bash
curl -X POST http://localhost:3000/api/detectFormat \
  -H "Content-Type: application/json" \
  -d '{
    "ideName": "vim"
  }'
```

## JavaScript/TypeScript Usage

### Using the FormatDetector Class

```typescript
import { FormatDetector } from '@/lib/format-detector'

// Initialize detector
const detector = new FormatDetector({
  enableLLMFallback: true,
  minConfidence: 60
})

// Detect format
const result = await detector.detectFormat('vscode', documentation)

console.log(`Preferred format: ${result.preferred_format}`)
console.log(`Confidence: ${result.confidence_score}%`)
console.log(`Methods used: ${result.detection_methods_used.join(', ')}`)
```

### Using in Next.js API Route

```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { FormatDetector } from '@/lib/format-detector'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { ideId, documentation } = req.body
  
  const detector = new FormatDetector()
  const result = await detector.detectFormat(ideId, documentation)
  
  res.status(200).json({ formatDetection: result })
}
```

## Testing the Detection Engine

### Run Test Suite

```bash
npm run test:format-detector
```

### Expected Output

```
🔍 Testing Prompt Format Detection Engine

✅ Visual Studio Code
   Expected: json, Predicted: json
   Confidence: 92%
   Methods: json-file-extension, json-code-fence, json-schema-pattern

✅ Cursor Editor
   Expected: markdown, Predicted: markdown
   Confidence: 88%
   Methods: markdown-headings, markdown-bullets, markdown-links

✅ GitHub Copilot
   Expected: plaintext, Predicted: plaintext
   Confidence: 75%
   Methods: plaintext-keywords

✅ Vim
   Expected: cli, Predicted: cli
   Confidence: 85%
   Methods: cli-dollar-commands, cli-flags, cli-keywords

✅ IntelliJ IDEA
   Expected: xml, Predicted: xml
   Confidence: 90%
   Methods: xml-code-fence, xml-keywords

📊 Test Results Summary
========================
Total Tests: 20
Correct Predictions: 18
Accuracy: 90.0%

🔧 Detection Methods Used:
   json-file-extension: 4 times
   markdown-headings: 6 times
   cli-dollar-commands: 3 times
   xml-code-fence: 4 times
   json-schema-pattern: 2 times

📈 Predicted Format Distribution:
   json: 5 IDEs
   markdown: 6 IDEs
   cli: 4 IDEs
   xml: 5 IDEs

✅ Target accuracy (≥85%) achieved!
```

## Integration with Existing Systems

### Adding to IDE Ingestion Pipeline

```typescript
import { DocChunkManager } from '@/lib/db-utils'
import { FormatDetector } from '@/lib/format-detector'

async function ingestAndDetectFormat(ideId: string) {
  // 1. Ingest documentation (existing logic)
  await crawlDocumentation(docsUrl, [], ideId, version)
  
  // 2. Detect preferred format
  const detector = new FormatDetector()
  const chunks = await DocChunkManager.getChunksByIDE(ideId, 20)
  const combinedDocs = chunks.map(c => c.text).join('\n\n')
  
  const formatResult = await detector.detectFormat(ideId, combinedDocs)
  
  // 3. Store format preference
  await supabaseAdmin
    .from('ides')
    .update({ 
      preferred_format: formatResult.preferred_format,
      format_confidence: formatResult.confidence_score 
    })
    .eq('id', ideId)
    
  return formatResult
}
```

### Using in Prompt Generation

```typescript
import { FormatDetector } from '@/lib/format-detector'

async function generatePrompt(ideId: string, taskDescription: string) {
  // 1. Detect format
  const detector = new FormatDetector()
  const formatResult = await detector.detectFormat(ideId, documentation)
  
  // 2. Generate format-specific prompt
  let prompt = ''
  
  switch (formatResult.preferred_format) {
    case 'json':
      prompt = generateJSONPrompt(taskDescription)
      break
    case 'markdown':
      prompt = generateMarkdownPrompt(taskDescription)
      break
    case 'cli':
      prompt = generateCLIPrompt(taskDescription)
      break
    case 'xml':
      prompt = generateXMLPrompt(taskDescription)
      break
    default:
      prompt = generatePlaintextPrompt(taskDescription)
  }
  
  return prompt
}
```

## Error Handling

### Common Error Responses

```json
{
  "error": "Either ideId or ideName must be provided"
}
```

```json
{
  "error": "IDE not found"
}
```

```json
{
  "error": "sampleSize must be a positive number"
}
```

### Handling LLM Fallback Failure

```typescript
const detector = new FormatDetector({
  enableLLMFallback: true,
  minConfidence: 60
})

try {
  const result = await detector.detectFormat(ideId, documentation)
  // Use result
} catch (error) {
  console.error('Format detection failed:', error)
  // Fallback to default format
  return { preferred_format: 'plaintext', confidence_score: 0 }
}
```

## Configuration

### Environment Variables

```bash
# .env.local
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_APP_URL=https://your-app.com
OPENROUTER_APP_NAME=Your App Name

# Optional OpenAI fallback
OPENAI_API_KEY=your_openai_api_key
```

### Custom Detection Options

```typescript
const detector = new FormatDetector({
  enableLLMFallback: true,    // Enable LLM fallback
  minConfidence: 70           // Higher confidence threshold
})
```

## Performance Considerations

### Optimize Sample Size

```typescript
// For quick detection
const quickDetector = new FormatDetector()
const quickResult = await quickDetector.detectFormat(ideId, documentation, {
  sampleSize: 10
})

// For comprehensive analysis
const thoroughDetector = new FormatDetector()
const thoroughResult = await thoroughDetector.detectFormat(ideId, documentation, {
  sampleSize: 50
})
```

### Disable LLM for Speed

```typescript
const fastDetector = new FormatDetector({
  enableLLMFallback: false,
  minConfidence: 50
})
```

### Batch Processing

```typescript
const detector = new FormatDetector()
const ideIds = ['vscode', 'cursor', 'vim']

const results = await Promise.all(
  ideIds.map(async (ideId) => {
    const docs = await getDocumentation(ideId)
    return detector.detectFormat(ideId, docs)
  })
)
```