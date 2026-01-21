import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://fqvqwqdaidzrlfrosywv.supabase.co',
  'sb_publishable_I9t2A9IIZ4puxBA2lmoJiw_n5Ua1UVT'
)

const run = async () => {
  const { data, error } = await supabase
    .from('test_table')
    .select('*')

  console.log(data, error)
}

run()
