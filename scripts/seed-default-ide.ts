/**
 * Quick script to add popular AI coding agents
 * Run with: npx tsx scripts/seed-default-ide.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!')
  console.error('Make sure .env.local has:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const defaultIDEs = [
  {
    name: 'Cursor',
    docs_url: 'https://docs.cursor.com',
    status: 'active',
    manifest: {
      name: 'Cursor',
      version: '1.0.0',
      description: 'AI-powered code editor built on VS Code',
      features: ['AI completion', 'Chat with codebase', 'Code generation', 'Multi-file editing']
    }
  },
  {
    name: 'GitHub Copilot',
    docs_url: 'https://docs.github.com/copilot',
    status: 'active',
    manifest: {
      name: 'GitHub Copilot',
      version: '1.0.0',
      description: 'AI pair programmer from GitHub',
      features: ['Code suggestions', 'Chat', 'Code explanation']
    }
  },
  {
    name: 'Windsurf',
    docs_url: 'https://docs.codeium.com/windsurf',
    status: 'active',
    manifest: {
      name: 'Windsurf',
      version: '1.0.0',
      description: 'Agentic IDE by Codeium',
      features: ['Cascade AI', 'Supercomplete', 'Multi-file editing']
    }
  },
  {
    name: 'Replit Agent',
    docs_url: 'https://docs.replit.com/replitai/agent',
    status: 'active',
    manifest: {
      name: 'Replit Agent',
      version: '1.0.0',
      description: 'AI agent that builds complete applications',
      features: ['Full-stack development', 'Deployment', 'Debugging']
    }
  },
  {
    name: 'Bolt.new',
    docs_url: 'https://bolt.new',
    status: 'active',
    manifest: {
      name: 'Bolt.new',
      version: '1.0.0',
      description: 'AI-powered full-stack web development',
      features: ['Instant deployment', 'Full-stack apps', 'Real-time preview']
    }
  }
]

async function seedDefaultIDEs() {
  console.log('🚀 Adding default AI coding agents...\n')

  // First, check if any IDEs already exist
  const { data: existing } = await supabase
    .from('ides')
    .select('name')

  const existingNames = new Set(existing?.map(ide => ide.name) || [])

  // Insert all at once (more efficient)
  const idesToInsert = defaultIDEs.filter(ide => !existingNames.has(ide.name))

  if (idesToInsert.length === 0) {
    console.log('⏭️  All IDEs already exist, nothing to add.')
  } else {
    console.log(`Adding ${idesToInsert.length} new IDEs...\n`)
    
    const { data, error } = await supabase
      .from('ides')
      .insert(idesToInsert)
      .select()

    if (error) {
      console.error('❌ Error adding IDEs:', error.message)
      console.error('Details:', error)
      
      // Try one by one if batch fails
      console.log('\n🔄 Trying to add one by one...\n')
      for (const ide of idesToInsert) {
        console.log(`Adding ${ide.name}...`)
        const { error: singleError } = await supabase
          .from('ides')
          .insert(ide)
          .select()
        
        if (singleError) {
          console.error(`❌ ${ide.name}: ${singleError.message}`)
        } else {
          console.log(`✅ ${ide.name} added`)
        }
      }
    } else {
      console.log(`✅ Successfully added ${data?.length || 0} IDEs`)
      data?.forEach(ide => console.log(`  - ${ide.name}`))
    }
  }

  console.log('\n🎉 Seeding complete!')
  
  // Show final count
  const { count } = await supabase
    .from('ides')
    .select('*', { count: 'exact', head: true })
  
  console.log(`\n📊 Total IDEs in database: ${count}`)
}

seedDefaultIDEs()
