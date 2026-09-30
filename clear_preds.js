import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://pgttaapbudanhhgchmta.supabase.co'
const supabaseKey = 'sb_publishable_R88H5jOqlWEOzOdCHmU47A__IYZfm7l'
const supabase = createClient(supabaseUrl, supabaseKey)

async function clear() {
  await supabase.from('predictions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('Predictions cleared!')
}
clear()
