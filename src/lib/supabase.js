import { createClient } from '@supabase/supabase-js'

/* Desarrollo */
//const supabaseUrl = process.env.SUPABASE_PROJECT_URL_DEV
//const supabaseKey = process.env.SUPABASE_API_KEY_DEV

/* Produccion*/      
const supabaseUrl = process.env.SUPABASE_PROJECT_URL
const supabaseKey = process.env.SUPABASE_API_KEY


const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase