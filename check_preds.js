import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://pgttaapbudanhhgchmta.supabase.co'
const supabaseKey = 'sb_publishable_R88H5jOqlWEOzOdCHmU47A__IYZfm7l'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('predictions').select('*')
  console.log('Predictions count:', data ? data.length : 0)
  console.log('Error:', error)
  const { data: models } = await supabase.from('model_metadata').select('id, is_active')
  console.log('Models count:', models ? models.length : 0)
}
check()
