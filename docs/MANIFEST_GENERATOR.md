# Prompt Manifest Generator

## Overview

The Prompt Manifest Generator is a comprehensive system for auto-generating per-IDE Prompt Manifest JSON files that define how to generate optimal prompts for each supported IDE.

## Architecture

### Components

#### 1. Manifest Builder (`lib/manifest-builder.ts`)

The core engine for generating IDE manifests from detected formats and crawled documentation.

**Key Features:**
- Detects preferred prompt format for each IDE (json, markdown, plaintext, cli, xml)
- Generates format-specific templates
- Creates validation rules based on format type
- Extracts unique documentation sources
- Validates template syntax before storage

**API:**
```typescript
class ManifestBuilder {
  buildManifest(
    ideId: string,
    ideName: string,
    formatDetection: FormatDetectionResult,
    docChunks: DocChunk[],
    version?: string
  ): IDEManifest
}
```

#### 2. Manifest Structure

Each generated manifest follows this structure:

```json
{
  "id": "cursor",
  "name": "Cursor",
  "preferred_format": "markdown",
  "fallback_formats": ["plaintext", "json"],
  "validation": {
    "type": "markdown-schema",
    "rules": [
      "Must have both system and user sections",
      "Each section should be non-empty",
      "Should follow the IDE-specific format guidelines",
      "Code blocks should use proper language fencing"
    ]
  },
  "templates": {
    "json": "{\"system\": \"...\", \"user\": \"...\"}",
    "markdown": "# System\n...\n# User\n...",
    "plaintext": "SYSTEM:\n...\nUSER:\n...",
    "cli": "--system '...' --user '...'",
    "xml": "<?xml version=\"1.0\"?><prompt>...</prompt>"
  },
  "doc_version": "1.0.0",
  "doc_sources": ["https://cursor.sh/docs", "https://cursor.sh/docs/advanced"],
  "trusted": true,
  "last_updated": "2025-01-15T10:30:00Z"
}
```

### API Endpoints

#### 1. `/api/buildManifest` (POST)

Generates and stores a new manifest for an IDE.

**Request:**
```json
{
  "ideId": "cursor",
  "enableLLMFallback": true,
  "sampleSize": 50
}
```

**Response:**
```json
{
  "message": "Manifest built and stored successfully",
  "data": {
    "ideId": "cursor",
    "ideName": "Cursor",
    "manifest": { /* full manifest object */ }
  }
}
```

**Error Responses:**
- `400` - Missing ideId or no documentation chunks found
- `404` - IDE not found
- `500` - Server error

#### 2. `/api/rebuildManifest` (POST)

Rebuilds an existing manifest with updated documentation.

**Request:**
```json
{
  "ideId": "cursor",
  "enableLLMFallback": true,
  "sampleSize": 50
}
```

**Response:**
```json
{
  "message": "Manifest rebuilt and stored successfully",
  "data": {
    "ideId": "cursor",
    "ideName": "Cursor",
    "manifest": { /* updated manifest */ },
    "previousManifest": { /* previous manifest or null */ }
  }
}
```

## Supported IDEs

The implementation supports 18 target IDEs:

| IDE | Preferred Format | Fallback Formats |
|-----|-----------------|------------------|
| Visual Studio Code | json | markdown, plaintext |
| Cursor | markdown | plaintext, json |
| GitHub Copilot | plaintext | markdown, cli |
| Vim | cli | plaintext, markdown |
| IntelliJ IDEA | xml | json, plaintext |
| Sublime Text | json | plaintext, markdown |
| Atom | json | markdown, plaintext |
| GNU Emacs | cli | plaintext, markdown |
| Notepad++ | xml | json, plaintext |
| Android Studio | json | xml, plaintext |
| Eclipse IDE | xml | json, plaintext |
| GNU nano | plaintext | markdown, cli |
| Neovim | cli | plaintext, markdown |
| Obsidian | markdown | plaintext, json |
| PyCharm | json | xml, plaintext |
| Typora | markdown | plaintext, json |
| WebStorm | json | xml, plaintext |
| Xcode | xml | json, plaintext |

## Format-Specific Templates

### JSON Format
```json
{
  "system": "You are a helpful assistant...",
  "user": "What would you like to know?",
  "context": {
    "ide_specific_features": [],
    "code_examples": [],
    "best_practices": []
  }
}
```

### Markdown Format
```markdown
# System
You are a helpful assistant...

## IDE-Specific Features
- Feature 1
- Feature 2

# User
What would you like to know?
```

### Plaintext Format
```
SYSTEM:
You are a helpful assistant...

IDE-SPECIFIC FEATURES:
- Feature 1

USER:
What would you like to know?
```

### CLI Format
```
--system "You are a helpful assistant..." --user "What would you like to know?" --format json
```

### XML Format
```xml
<?xml version="1.0" encoding="UTF-8"?>
<prompt>
  <system>
    <base>You are a helpful assistant...</base>
    <ide_features>
      <feature>Feature 1</feature>
    </ide_features>
  </system>
  <user>
    <question>What would you like to know?</question>
  </user>
</prompt>
```

## Validation Rules

Each format has its own validation rules:

### JSON Validation
- Valid JSON syntax required
- Must include "system" field
- Must include "user" field
- All strings must be properly escaped

### Markdown Validation
- Valid Markdown syntax required
- Must have System and User sections as headers
- Code blocks should use proper language fencing
- Links should use Markdown link syntax

### XML Validation
- Valid XML syntax required
- Must have system and user root elements
- All tags must be properly closed
- Special characters must be properly escaped

### CLI Validation
- Valid command-line syntax required
- Flags must use proper -- or - notation
- Arguments must be properly quoted
- Option names should be lowercase with hyphens

### Plaintext Validation
- Plain text format with clear section separators
- Sections must be prefixed with UPPERCASE labels
- Each section should be on its own line
- No special characters required

## Integration with Other Components

### Format Detection
The manifest builder integrates with the Format Detection Engine (`lib/format-detector.ts`) to:
- Analyze documentation samples to determine preferred format
- Generate fallback format options
- Provide confidence scores for format detection

### Document Ingestion
Works with the Document Crawler (`lib/crawler.ts`) to:
- Extract unique documentation sources
- Access parsed document chunks
- Track document versions

### Database Storage
Stores manifests in the Supabase `ides` table:
- Field: `manifest` (JSONB)
- Updated via `IDEManager.updateIDE()`
- Retrieved with IDE data queries

## Testing

### Unit Tests
```bash
npm run test:manifest-builder
```

### Validation Tests
```bash
node scripts/validate-manifest-implementation.js
```

### Generation Tests
```bash
node scripts/test-manifest-generation.js
```

### Build Validation
```bash
npm run build
```

## Usage Examples

### Generate Manifest for a New IDE
```typescript
// 1. Ingest documentation
POST /api/ingestIDE
{
  "ideId": "vscode",
  "seedUrls": ["https://code.visualstudio.com/docs"]
}

// 2. Detect format
POST /api/detectFormat
{
  "ideId": "vscode",
  "sampleSize": 20
}

// 3. Build manifest
POST /api/buildManifest
{
  "ideId": "vscode",
  "enableLLMFallback": true
}
```

### Rebuild Manifest After Documentation Update
```typescript
// 1. Re-ingest documentation
POST /api/ingestIDE
{
  "ideId": "vscode",
  "replaceExisting": true
}

// 2. Rebuild manifest
POST /api/rebuildManifest
{
  "ideId": "vscode"
}
```

## Performance Considerations

- **Sample Size**: Default 50 chunks for format detection (configurable)
- **Template Generation**: All formats generated upfront for flexibility
- **Validation**: Templates validated during manifest generation
- **Source Extraction**: Efficient Set-based deduplication
- **Database Operations**: Single update per IDE per build

## Error Handling

- **Missing Documentation**: Returns 400 with descriptive message
- **IDE Not Found**: Returns 404
- **Invalid Format Detection**: Falls back to plaintext format
- **Template Validation Warnings**: Logged but don't fail manifest generation
- **Database Errors**: Returned with full error message

## Future Enhancements

1. **Smart Template Generation**: Extract actual patterns from documentation
2. **Format-Specific Optimization**: Tailor templates based on IDE capabilities
3. **Batch Manifest Generation**: Build multiple IDE manifests in one operation
4. **Template Versioning**: Track and manage manifest template versions
5. **Quality Metrics**: Add confidence scores for generated manifests
6. **Custom Validation Rules**: Allow IDE-specific validation customization

## Files

- `lib/manifest-builder.ts` - Core manifest generation logic
- `pages/api/buildManifest.ts` - Build API endpoint
- `pages/api/rebuildManifest.ts` - Rebuild API endpoint
- `scripts/test-manifest-builder.js` - Manifest structure tests
- `scripts/test-manifest-generation.js` - Generation logic tests
- `scripts/validate-manifest-implementation.js` - Implementation validation

## Dependencies

- `@supabase/supabase-js` - Database operations
- `lib/format-detector.ts` - Format detection
- `lib/db-utils.ts` - Database utilities
- `types/database.ts` - TypeScript types
