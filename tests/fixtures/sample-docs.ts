export const SAMPLE_JSON_DOC = `
# VS Code Documentation

## Getting Started

VS Code uses JSON configuration files extensively. Here's an example:

\`\`\`json
{
  "editor.fontSize": 14,
  "editor.tabSize": 2
}
\`\`\`

You can configure your settings in settings.json.
`

export const SAMPLE_MARKDOWN_DOC = `
# Markdown Editor

## Features

- Syntax highlighting
- Live preview
- Auto-completion

### Headers

Use # for headers:
- # Heading 1
- ## Heading 2
- ### Heading 3

### Lists

You can create:
- Bullet lists
- Numbered lists
  1. Item 1
  2. Item 2

### Links

Format: [Link Text](https://example.com)
`

export const SAMPLE_CLI_DOC = `
# Command Line Tool

## Usage

$ mycli --help
$ mycli init --name myproject
$ mycli build --output dist

## Options

- --help: Show help
- --version: Show version
- --verbose: Enable verbose output

## Flags

Use flags to customize:
- -v: Verbose
- -q: Quiet
- -f: Force
`

export const SAMPLE_XML_DOC = `
# XML Configuration

Configure your application with XML:

\`\`\`xml
<configuration>
  <appSettings>
    <add key="setting1" value="value1"/>
  </appSettings>
</configuration>
\`\`\`

XML files use .xml extension.
`

export const SAMPLE_PLAINTEXT_DOC = `
GETTING STARTED

This is plain text documentation.
No special formatting required.

INSTALLATION

1. Download the installer
2. Run the setup wizard
3. Follow the prompts

CONFIGURATION

Edit the config.txt file with your settings.
`

export const LONG_DOCUMENT = `
# Comprehensive IDE Guide

${'## Section ' + Array.from({ length: 50 }, (_, i) => i + 1).join('\n\n## Section ')}

`.repeat(5)

export const EMPTY_DOCUMENT = ''

export const SINGLE_LINE_DOCUMENT = 'This is a single line document.'

export const UNICODE_DOCUMENT = `
# Unicode Support 🚀

支持中文字符
Supports émojis 😀🎉
Кириллица тоже работает
`
