import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://pgttaapbudanhhgchmta.supabase.co'
const supabaseKey = 'sb_publishable_R88H5jOqlWEOzOdCHmU47A__IYZfm7l'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase
    .from('predictions')
    .select(`
      district,
      predicted_month,
      severity_index_predicted,
      severity_class_predicted,
      model_metadata!inner(is_active)
    `)
    .eq('model_metadata.is_active', true)
  
  console.log('Returned data:', JSON.stringify(data, null, 2))
  console.log('Error:', error)
}
check()
