
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jhlizbaiklxaufaxekcz.supabase.co',
  'sb_publishable_L7NbwZiIZV1-jlTJZriUkw_5z5UlZfY'
)

async function check() {
  const columns = ['first_name', 'last_name']
  for (const col of columns) {
      const { error: colErr } = await supabase.from('candidates').select(col).limit(1)
      if (colErr) {
          console.log(`Column [${col}] does NOT exist.`)
      } else {
          console.log(`Column [${col}] exists.`)
      }
  }
}

check()
