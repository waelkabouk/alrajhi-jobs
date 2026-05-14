
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://jhlizbaiklxaufaxekcz.supabase.co',
  'sb_publishable_L7NbwZiIZV1-jlTJZriUkw_5z5UlZfY'
)

async function check() {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error fetching candidates:', error.message)
  } else {
    console.log('Actual columns in candidates table:', data.length > 0 ? Object.keys(data[0]) : 'Table is empty, but query succeeded.')
    if (data.length === 0) {
        // If table is empty, we can try to select specific columns to see if they exist
        const columns = ['transferable_iqama', 'residence_country', 'residence_city', 'job_title', 'current_salary', 'expected_salary', 'notes', 'experience_years', 'gender', 'nationality', 'marital_status', 'qualifications', 'location']
        for (const col of columns) {
            const { error: colErr } = await supabase.from('candidates').select(col).limit(1)
            if (colErr) {
                console.log(`Column [${col}] does NOT exist.`)
            } else {
                console.log(`Column [${col}] exists.`)
            }
        }
    }
  }
}

check()
