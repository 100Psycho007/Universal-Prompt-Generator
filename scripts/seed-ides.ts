import { supabaseAdmin } from '../lib/supabase-client'

const sampleIDEs = [
  {
    name: 'Visual Studio Code',
    docs_url: 'https://code.visualstudio.com/docs',
    status: 'active',
    manifest: {
      preferred_formats: ['json', 'markdown'],
      fallback_formats: ['plaintext'],
      doc_version: '1.0.0',
      trusted: true
    }
  },
  {
    name: 'IntelliJ IDEA',
    docs_url: 'https://www.jetbrains.com/idea/documentation/',
    status: 'active',
    manifest: {
      preferred_formats: ['json', 'markdown'],
      fallback_formats: ['plaintext'],
      doc_version: '1.0.0',
      trusted: true
    }
  },
  {
    name: 'Sublime Text',
    docs_url: 'https://www.sublimetext.com/docs/',
    status: 'active',
    manifest: {
      preferred_formats: ['json', 'markdown'],
      fallback_formats: ['plaintext'],
      doc_version: '1.0.0',
      trusted: true
    }
  },
  {
    name: 'Atom',
    docs_url: 'https://flight-manual.atom.io/',
    status: 'active',
    manifest: {
      preferred_formats: ['json', 'markdown'],
      fallback_formats: ['plaintext'],
      doc_version: '1.0.0',
      trusted: true
    }
  },
  {
    name: 'Vim',
    docs_url: 'https://vimhelp.org/',
    status: 'active',
    manifest: {
      preferred_formats: ['json', 'markdown'],
      fallback_formats: ['plaintext'],
      doc_version: '1.0.0',
      trusted: true
    }
  }
]

async function seedIDEs() {
  console.log('Seeding sample IDEs...')
  
  try {
    for (const ide of sampleIDEs) {
      const { data, error } = await supabaseAdmin
        .from('ides')
        .upsert(ide, { onConflict: 'name' })
      
      if (error) {
        console.error(`Error inserting ${ide.name}:`, error)
      } else {
        console.log(`✓ ${ide.name} inserted/updated`)
      }
    }
    
    console.log('Seeding completed!')
  } catch (error) {
    console.error('Unexpected error during seeding:', error)
  }
}

seedIDEs()