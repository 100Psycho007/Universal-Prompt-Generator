import { supabaseAdmin } from '../lib/supabase-client'

async function testIDEs() {
  try {
    console.log('Testing IDEs API...')
    
    const { data, error } = await supabaseAdmin
      .from('ides')
      .select('*')
      .limit(5)

    if (error) {
      console.error('Error fetching IDEs:', error)
      return
    }

    console.log('Found IDEs:', data?.length || 0)
    if (data && data.length > 0) {
      console.log('Sample IDE:', data[0])
    }
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

testIDEs()