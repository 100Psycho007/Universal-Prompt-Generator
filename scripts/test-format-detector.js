#!/usr/bin/env node

/**
 * Test script for the prompt format detection engine
 * Tests against sample IDEs with known format preferences
 */

// Sample IDE documentation for testing
const sampleIDEs = [
  {
    id: 'vscode',
    name: 'Visual Studio Code',
    expectedFormat: 'json',
    documentation: `
# VS Code Extension Development

## package.json Structure
The main extension manifest is defined in package.json:

\`\`\`json
{
  "name": "my-extension",
  "displayName": "My Extension",
  "description": "A sample extension",
  "version": "0.0.1",
  "engines": {
    "vscode": "^1.60.0"
  },
  "categories": ["Other"],
  "activationEvents": [
    "onCommand:extension.helloWorld"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [{
      "command": "extension.helloWorld",
      "title": "Hello World"
    }]
  }
}
\`\`\`

## Extension Manifest Schema
The extension manifest follows the JSON schema defined in the VS Code documentation.
    `
  },
  {
    id: 'cursor',
    name: 'Cursor Editor',
    expectedFormat: 'markdown',
    documentation: `
# Cursor Editor Documentation

## Getting Started

Welcome to Cursor, the AI-first code editor. This guide will help you get started with the basics.

### Installation

1. Download Cursor from the official website
2. Install the application
3. Launch and sign in

### Basic Features

- **AI Chat**: Integrated AI assistant
- **Code Generation**: Smart code completion
- **Multi-file Editing**: Edit multiple files simultaneously

#### Advanced Usage

For more advanced features, see the [Advanced Guide](./advanced.md).

##### Tips and Tricks

- Use \`Ctrl+K\` to open AI chat
- Press \`Ctrl+Shift+P\` for command palette
- Try the inline AI suggestions

### Configuration

Configure your settings in the preferences panel.
    `
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    expectedFormat: 'plaintext',
    documentation: `
GitHub Copilot Documentation

Getting Started with GitHub Copilot

GitHub Copilot is an AI-powered code completion tool that helps developers write code faster and with less work. It provides suggestions for whole lines or entire functions right inside your editor.

How to Use

1. Install the GitHub Copilot extension in your editor
2. Sign in with your GitHub account
3. Start coding and Copilot will provide suggestions

Features

- Code completion
- Function generation
- Comment to code
- Language translation

Best Practices

- Review all suggestions before accepting
- Use Copilot as a starting point, not a final solution
- Learn from the suggestions to improve your own coding

Support

For help and support, visit the GitHub Copilot documentation website.
    `
  },
  {
    id: 'vim',
    name: 'Vim',
    expectedFormat: 'cli',
    documentation: `
# Vim Editor Usage Guide

## Basic Commands

$ vim filename.txt
$ vim -R readonly.txt
$ vim +linenumber filename.txt

### Navigation

- h - Move left
- j - Move down  
- k - Move up
- l - Move right

- w - Move to next word
- b - Move to previous word
- gg - Go to beginning of file
- G - Go to end of file

### Editing Commands

- i - Insert mode
- a - Append after cursor
- o - Open new line below
- dd - Delete current line
- yy - Yank current line
- p - Paste after cursor

### Search and Replace

/pattern - Search forward
?pattern - Search backward
:%s/old/new/g - Replace all occurrences

### Options

:set number - Show line numbers
:set syntax=on - Enable syntax highlighting
:set autoindent - Enable auto indentation

Usage Examples:

$ vim -c ":set number" file.txt
$ vim -R README.md
$ vim +100 script.py

For more help, use :help command inside vim.
    `
  },
  {
    id: 'intellij',
    name: 'IntelliJ IDEA',
    expectedFormat: 'xml',
    documentation: `
# IntelliJ IDEA Plugin Development

## Plugin Configuration

The main plugin configuration is defined in plugin.xml:

\`\`\`xml
<idea-plugin>
    <id>com.example.myplugin</id>
    <name>My Plugin</name>
    <vendor email="support@example.com" url="http://www.example.com">Example Corp</vendor>
    <description><![CDATA[
        A sample plugin for IntelliJ IDEA
    ]]></description>
    
    <depends>com.intellij.modules.platform</depends>
    
    <extensions defaultExtensionNs="com.intellij">
        <applicationService serviceImplementation="com.example.MyService"/>
    </extensions>
    
    <actions>
        <action id="com.example.MyAction" class="com.example.MyAction" text="My Action">
            <add-to-group group-id="ToolsMenu" anchor="first"/>
        </action>
    </actions>
</idea-plugin>
\`\`\`

## Build Configuration

Maven configuration for IntelliJ plugins:

\`\`\`xml
<project>
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>my-intellij-plugin</artifactId>
    <version>1.0.0</version>
    
    <properties>
        <idea.version>2023.2</idea.version>
    </properties>
</project>
\`\`\`
    `
  },
  {
    id: 'sublime-text',
    name: 'Sublime Text',
    expectedFormat: 'json',
    documentation: `
# Sublime Text Package Development

## Package Control file

The package.json file defines your Sublime Text package:

\`\`\`json
{
  "name": "MyPackage",
  "version": "1.0.0",
  "description": "A sample Sublime Text package",
  "url": "https://github.com/user/mypackage",
  "author": "Your Name",
  "main": "main.py"
}
\`\`\`

## Key Bindings Configuration

Key bindings are defined in JSON format:

\`\`\`json
[
  {
    "keys": ["ctrl+shift+p"],
    "command": "show_overlay",
    "args": {"overlay": "command_palette"}
  }
]
\`\`\`

## Settings

User settings are stored in JSON format in Preferences.sublime-settings.
    `
  },
  {
    id: 'atom',
    name: 'Atom Editor',
    expectedFormat: 'json',
    documentation: `
# Atom Package Development

## package.json Structure

Every Atom package requires a package.json file:

\`\`\`json
{
  "name": "my-atom-package",
  "main": "./lib/my-atom-package",
  "version": "0.0.1",
  "description": "A short description of your package",
  "keywords": [],
  "activationCommands": {
    "atom-workspace": "my-atom-package:toggle"
  },
  "repository": "https://github.com/atom/my-atom-package",
  "license": "MIT",
  "engines": {
    "atom": ">=1.0.0 <2.0.0"
  },
  "dependencies": {},
  "consumedServices": {
    "status-bar": {
      "versions": {
        "^1.0.0": "consumeStatusBar"
      }
    }
  }
}
\`\`\`

## Configuration Schema

Atom uses JSON schema for package configuration validation.
    `
  },
  {
    id: 'emacs',
    name: 'GNU Emacs',
    expectedFormat: 'cli',
    documentation: `
# GNU Emacs Usage Guide

## Command Line Usage

$ emacs filename.txt
$ emacs --no-window-system filename.txt
$ emacs -batch -l script.el

### Common Command Line Options

- --version: Display version information
- --help: Show help message
- --no-window-system: Run in terminal mode
- --batch: Run in batch mode
- --load: Load a Lisp file

### File Operations

$ emacs -nw file.txt          # No window system
$ emacs +25 file.txt           # Open at line 25
$ emacs --eval "(setq x 5)"    # Evaluate Lisp expression

### Batch Processing

$ emacs --batch --eval "(progn (find-file \"input.txt\") (write-file \"output.txt\"))"

### Keyboard Shortcuts in Terminal

- C-x C-f: Find file
- C-x C-s: Save file
- C-x C-c: Exit Emacs
- C-g: Cancel current operation

Usage examples for scripting and automation tasks.
    `
  },
  {
    id: 'notepad++',
    name: 'Notepad++',
    expectedFormat: 'xml',
    documentation: `
# Notepad++ Plugin Development

## Plugin Configuration File

Notepad++ plugins use XML configuration:

\`\`\`xml
<NotepadPlus>
    <PluginInfos>
        <PluginInfo name="MyPlugin" version="1.0" author="Your Name">
            <Description>A sample Notepad++ plugin</Description>
        </PluginInfo>
    </PluginInfos>
    
    <ScintillaKeys>
        <ScintillaKey ScintKey="80" ScintCtrl="yes" ScintShift="no" ScintAlt="no">
            <MenuEntry Name="Plugin Commands" MenuItemName="My Plugin Action"/>
        </ScintKey>
    </ScintillaKeys>
</NotepadPlus>
\`\`\`

## Config.xml Format

The main configuration file uses XML structure:

\`\`\`xml
<NotepadPlus>
    <GUIConfigs>
        <GUIConfig name="StatusBar" show="yes"/>
        <GUIConfig name="TabBar" multiLine="yes" vertical="no"/>
        <GUIConfig name="ScintillaViewsSplitter" orientation="1"/>
    </GUIConfigs>
    
    <LexerStyles>
        <LexerType name="cpp" desc="C++" ext="">
            <WordsStyle name="KEYWORD" styleID="5" fgColor="0000FF" bgColor="FFFFFF"/>
        </LexerType>
    </LexerStyles>
</NotepadPlus>
\`\`\`

## Language Definition Files

Custom languages are defined using XML format in the langs.xml file.
    `
  },
  {
    id: 'webstorm',
    name: 'WebStorm',
    expectedFormat: 'xml',
    documentation: `
# WebStorm Plugin Development

## Plugin Configuration

WebStorm plugins use plugin.xml configuration:

\`\`\`xml
<idea-plugin>
    <id>com.example.webstorm-plugin</id>
    <name>WebStorm Plugin</name>
    <version>1.0.0</version>
    <vendor email="support@example.com">Example Corp</vendor>
    
    <description><![CDATA[
        A WebStorm plugin for web development
    ]]></description>
    
    <depends>com.intellij.modules.platform</depends>
    <depends>JavaScript</depends>
    
    <extensions defaultExtensionNs="com.intellij">
        <fileTypeFactory implementation="com.example.MyFileTypeFactory"/>
        <lang.parserDefinition language="MyLanguage" implementationClass="com.example.MyParserDefinition"/>
    </extensions>
</idea-plugin>
\`\`\`

## Web Framework Support

Configuration for web frameworks in XML:

\`\`\`xml
<frameworks>
    <framework id="react" name="React">
        <implementation>com.example.react.ReactFrameworkSupportProvider</implementation>
    </framework>
</frameworks>
\`\`\`
    `
  },
  {
    id: 'pycharm',
    name: 'PyCharm',
    expectedFormat: 'xml',
    documentation: `
# PyCharm Plugin Development

## Plugin Configuration

PyCharm plugins are configured with XML:

\`\`\`xml
<idea-plugin>
    <id>com.example.pycharm-plugin</id>
    <name>PyCharm Plugin</name>
    <version>1.0.0</version>
    <vendor>Example Corp</vendor>
    
    <description><![CDATA[
        A PyCharm plugin for Python development
    ]]></description>
    
    <depends>com.intellij.modules.platform</depends>
    <depends>PythonCore</depends>
    
    <extensions defaultExtensionNs="com.intellij">
        <python.sdkService implementation="com.example.MySdkService"/>
        <runConfigurationProducer implementation="com.example.MyRunConfigurationProducer"/>
    </extensions>
</idea-plugin>
\`\`\`

## Python Support Configuration

XML configuration for Python features:

\`\`\`xml
<python-plugin>
    <sdkType implementation="com.example.MySdkType"/>
    <runConfigurationType implementation="com.example.MyRunConfigType"/>
</python-plugin>
\`\`\`
    `
  },
  {
    id: 'neovim',
    name: 'Neovim',
    expectedFormat: 'cli',
    documentation: `
# Neovim Usage Guide

## Command Line Interface

$ nvim filename.txt
$ nvim --headless filename.txt
$ nvim --clean config.lua

### Basic Commands

- nvim file.txt: Open file in Neovim
- nvim -u NONE file.txt: Start without config
- nvim --cmd "set number" file.txt: Execute command on startup

### Remote Control

$ nvim --remote-send ":wq<CR>"
$ nvim --remote-tab file.txt
$ nvim --serverlist

### Headless Operation

$ nvim --headless -c "lua print('Hello')" -c "qa"
$ nvim --headless -s script.vim input.txt

### Terminal Mode

$ nvim -c "terminal" 
$ nvim -c "terminal bash"
$ nvim -c "terminal! python script.py"

### Configuration Commands

$ nvim -c "set number" file.txt
$ nvim -c "set syntax=python" file.py
$ nvim -c "colorscheme desert" file.txt

Command-line options for scripting and automation.
    `
  },
  {
    id: 'nano',
    name: 'Nano Editor',
    expectedFormat: 'cli',
    documentation: `
# Nano Text Editor Usage

## Command Line Usage

$ nano filename.txt
$ nano -B filename.txt
$ nano -I filename.txt

### Command Line Options

- -h, --help: Show help message
- -V, --version: Display version
- -B, --backup: Save backup files
- -I, --ignorercfiles: Don't look at nanorc files
- -m, --mouse: Enable mouse support
- -l, --linenumbers: Show line numbers

### File Operations

$ nano +10 file.txt          # Start at line 10
$ nano -R file.txt           # Restricted mode
$ nano -v file.txt           # View mode (read-only)

### Search and Replace

$ nano +/pattern file.txt    # Start at first occurrence
$ nano -Y syntax file.txt    # Force syntax highlighting

### Configuration

$ nano ~/.nanorc             # Edit configuration
$ nanorc --syntax=python     # Specific syntax

### Examples

$ nano -B -I -m document.txt
$ nano +100 -l large_file.txt
$ nano -Y python script.py

Command-line interface for the nano text editor.
    `
  },
  {
    id: 'xcode',
    name: 'Xcode',
    expectedFormat: 'xml',
    documentation: `
# Xcode Plugin Development

## Plugin Configuration

Xcode plugins use Info.plist XML format:

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>com.example.xcode-plugin</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>XPC!</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>DVTPlugInCompatibilityUUIDs</key>
    <array>
        <string>A2E4D43F-41F4-4FB9-BB94-7177011C9AED</string>
    </array>
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2023 Example Corp. All rights reserved.</string>
</dict>
</plist>
\`\`\`

## Project Configuration

Xcode project files use XML structure:

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<Project>
    <BuildActionList>
        <BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES">
            <BuildableReference BuildableIdentifier="primary">
            </BuildableReference>
        </BuildActionEntry>
    </BuildActionList>
</Project>
\`\`\`
    `
  },
  {
    id: 'android-studio',
    name: 'Android Studio',
    expectedFormat: 'xml',
    documentation: `
# Android Studio Plugin Development

## Plugin Configuration

Android Studio plugins use plugin.xml:

\`\`\`xml
<idea-plugin>
    <id>com.example.android-studio-plugin</id>
    <name>Android Studio Plugin</name>
    <version>1.0.0</version>
    <vendor email="support@example.com">Example Corp</vendor>
    
    <description><![CDATA[
        A plugin for Android development in Android Studio
    ]]></description>
    
    <depends>com.intellij.modules.platform</depends>
    <depends>org.jetbrains.android</depends>
    
    <extensions defaultExtensionNs="com.intellij">
        <applicationService serviceImplementation="com.example.MyAndroidService"/>
    </extensions>
</idea-plugin>
\`\`\`

## Android Manifest Configuration

Android app configuration uses XML:

\`\`\`xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.app">
    
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/AppTheme">
        
        <activity android:name=".MainActivity">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
\`\`\`
    `
  },
  {
    id: 'eclipse',
    name: 'Eclipse IDE',
    expectedFormat: 'xml',
    documentation: `
# Eclipse Plugin Development

## Plugin Configuration

Eclipse plugins use plugin.xml:

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<?eclipse version="3.4"?>
<plugin>
   <extension
         point="org.eclipse.ui.views">
      <view
            name="Sample View"
            class="com.example.SampleView"
            id="com.example.sampleView">
      </view>
   </extension>
   
   <extension
         point="org.eclipse.ui.commands">
      <command
            name="Sample Command"
            id="com.example.sampleCommand">
      </command>
   </extension>
</plugin>
\`\`\`

## Feature Configuration

Eclipse features use feature.xml:

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<feature
      id="com.example.feature"
      label="Sample Feature"
      version="1.0.0.qualifier">

   <description url="http://www.example.com/description">
      A sample Eclipse feature
   </description>

   <copyright url="http://www.example.com/copyright">
      Copyright (c) 2023 Example Corp
   </copyright>

   <license url="http://www.example.com/license">
      Sample license text
   </license>

   <plugin
         id="com.example.plugin"
         download-size="0"
         install-size="0"
         version="0.0.0"/>
</feature>
\`\`\`
    `
  },
  {
    id: 'typora',
    name: 'Typora',
    expectedFormat: 'markdown',
    documentation: `
# Typora Markdown Editor

## Getting Started

Welcome to Typora, the minimal markdown editor.

### Basic Markdown Usage

Typora provides real-time markdown preview and editing.

#### Headers

# This is a Level 1 Header
## This is a Level 2 Header
### This is a Level 3 Header

#### Lists

Unordered lists:
- Item 1
- Item 2
  - Nested item
  - Another nested item

Ordered lists:
1. First item
2. Second item
3. Third item

##### Links and Images

[Link text](https://example.com)
![Alt text](image.jpg)

##### Code and Formatting

Inline \`code\` and **bold** and *italic* text.

Code blocks:

\`\`\`python
def hello():
    print("Hello, Typora!")
\`\`\`

##### Blockquotes

> This is a blockquote
> 
> It can span multiple lines

##### Tables

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Row 1    | Data 1   | Data 2   |
| Row 2    | Data 3   | Data 4   |

### Typora Features

- **Live Preview**: See markdown rendered in real-time
- **Focus Mode**: Focus on current sentence
- **Typewriter Mode**: Keep current line centered
- **Themes**: Customizable themes and styles
- **Export**: Export to PDF, HTML, and other formats

#### Advanced Features

For more advanced features, see the [Typora documentation](https://typora.io).

##### Tips and Tricks

- Use \`Ctrl+/\` to toggle source code mode
- Press \`Ctrl+K\` to insert links
- Try the outline panel for navigation

### Configuration

Configure Typora through the preferences panel. Settings are stored in markdown-compatible configuration files.
    `
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    expectedFormat: 'markdown',
    documentation: `
# Obsidian Knowledge Base

## Welcome to Obsidian

Obsidian is a powerful knowledge base that works on local Markdown files.

### Getting Started

#### Creating Your First Note

1. Click "New note" or press \`Ctrl+N\`
2. Start writing in markdown
3. Your notes are saved as .md files

#### Markdown Basics

# Headers
Use # for headers, ## for subheaders, etc.

## Links and Connections

### Internal Links

Create links between notes using double brackets:
\`\`\`markdown
[[Another Note]]
[[Note with Display Text|Custom Display]]
\`\`\`

### External Links

Standard markdown links work too:
\`\`\`markdown
[Obsidian Website](https://obsidian.md)
\`\`\`

#### Tags and Organization

### Tags

Use hashtags to tag your content:
\`\`\`markdown
#project #important #research
\`\`\`

### Folders

Organize notes in folders:
- Projects/
- Research/
- Daily/

#### Advanced Features

### Wikilinks

Connect your knowledge base with wikilinks:
- [[Daily Notes]]
- [[Project Planning]]
- [[Meeting Notes]]

### Templates

Create templates for consistent note structure:
- Daily note template
- Meeting template
- Project template

### Graph View

Visualize connections between your notes in the graph view.

### Plugins

Extend Obsidian with community plugins:
- Calendar
- Kanban boards
- Excalidraw for diagrams
- Dataview for queries

#### Best Practices

1. **Daily Notes**: Create a daily note habit
2. **Link Everything**: Connect related ideas
3. **Use Tags**: Organize with meaningful tags
4. **Templates**: Standardize common note types
5. **Review**: Regularly review and update your knowledge

### Markdown Features

#### Code Blocks

\`\`\`javascript
function hello() {
    console.log("Hello Obsidian!");
}
\`\`\`

#### Tables

| Feature | Description |
|---------|-------------|
| Links | Connect notes |
| Tags | Organize content |
| Templates | Standardize notes |

#### Math Support

Inline math: $E = mc^2$

Block math:
$
\\sum_{i=1}^{n} x_i = x_1 + x_2 + \\dots + x_n
$

#### Callouts

> [!NOTE] Important information
> This is a note callout for highlighting important content.

> [!WARNING] Warning
> This is a warning callout for cautionary information.

#### Lists and Checkboxes

- [x] Completed task
- [ ] Incomplete task
- [ ] Another task

#### Formatting

- **Bold text**
- *Italic text*
- ~~Strikethrough~~
- \`Inline code\`

### Obsidian-Specific Syntax

#### Embeds

Embed other notes or files:
\`\`\`markdown
![[Embedded Note]]
![[image.png]]
\`\`\`

#### Transclusions

Include content from other notes:
\`\`\`markdown
!^transclusion-id
\`\`\`

Build your second brain with Obsidian's powerful markdown-based system.
    `
  }
]

async function testFormatDetection() {
  console.log('🔍 Testing Prompt Format Detection Engine\n')
  
  try {
    // Import the FormatDetector
    const { FormatDetector } = await import('../lib/format-detector.js')
    
    const detector = new FormatDetector({
      enableLLMFallback: false, // Disable LLM for testing to focus on heuristics
      minConfidence: 60
    })

    let totalTests = 0
    let correctPredictions = 0
    const results = []

    for (const ide of sampleIDEs) {
      totalTests++
      
      try {
        const result = await detector.detectFormat(ide.id, ide.documentation)
        const isCorrect = result.preferred_format === ide.expectedFormat
        
        if (isCorrect) {
          correctPredictions++
        }
        
        results.push({
          id: ide.id,
          name: ide.name,
          expected: ide.expectedFormat,
          predicted: result.preferred_format,
          confidence: result.confidence_score,
          correct: isCorrect,
          methods: result.detection_methods_used
        })
        
        console.log(`${isCorrect ? '✅' : '❌'} ${ide.name}`)
        console.log(`   Expected: ${ide.expectedFormat}, Predicted: ${result.preferred_format}`)
        console.log(`   Confidence: ${result.confidence_score}%`)
        console.log(`   Methods: ${result.detection_methods_used.join(', ')}\n`)
        
      } catch (error) {
        console.log(`❌ ${ide.name} - ERROR: ${error.message}\n`)
        results.push({
          id: ide.id,
          name: ide.name,
          expected: ide.expectedFormat,
          predicted: 'error',
          confidence: 0,
          correct: false,
          error: error.message
        })
      }
    }

    // Summary
    console.log('📊 Test Results Summary')
    console.log('========================')
    console.log(`Total Tests: ${totalTests}`)
    console.log(`Correct Predictions: ${correctPredictions}`)
    console.log(`Accuracy: ${((correctPredictions / totalTests) * 100).toFixed(1)}%`)
    
    // Method analysis
    const methodCounts = {}
    results.forEach(result => {
      if (result.methods) {
        result.methods.forEach(method => {
          methodCounts[method] = (methodCounts[method] || 0) + 1
        })
      }
    })
    
    console.log('\n🔧 Detection Methods Used:')
    Object.entries(methodCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([method, count]) => {
        console.log(`   ${method}: ${count} times`)
      })

    // Format distribution
    const formatCounts = {}
    results.forEach(result => {
      const format = result.predicted
      formatCounts[format] = (formatCounts[format] || 0) + 1
    })
    
    console.log('\n📈 Predicted Format Distribution:')
    Object.entries(formatCounts).forEach(([format, count]) => {
      console.log(`   ${format}: ${count} IDEs`)
    })

    return {
      totalTests,
      correctPredictions,
      accuracy: (correctPredictions / totalTests) * 100,
      results
    }

  } catch (error) {
    console.error('Test execution failed:', error)
    throw error
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testFormatDetection()
    .then(summary => {
      console.log('\n🏁 Testing completed!')
      const accuracy = summary.accuracy
      if (accuracy >= 85) {
        console.log('✅ Target accuracy (≥85%) achieved!')
        process.exit(0)
      } else {
        console.log(`❌ Target accuracy (≥85%) not achieved. Current: ${accuracy.toFixed(1)}%`)
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('Test execution failed:', error)
      process.exit(1)
    })
}

module.exports = { testFormatDetection, sampleIDEs }