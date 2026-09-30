import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://pgttaapbudanhhgchmta.supabase.co'
const supabaseKey = 'sb_publishable_R88H5jOqlWEOzOdCHmU47A__IYZfm7l'
const supabase = createClient(supabaseUrl, supabaseKey)

async function clear() {
  console.log('Attempting to delete...')
  const { error } = await supabase.from('drought_data').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log(error || 'Data cleared successfully!')
}
clear()
