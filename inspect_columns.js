import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://koubjdnhazjtykkmalfw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdWJqZG5oYXpqdHlra21hbGZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU5MjA2NTYsImV4cCI6MjA0MTQ5NjY1Nn0.oWcXG_M4EC5_nw6gchqN6LHujrxIn-nzPvpPsdEGsDc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('--- Inspecting mCliente structure ---');
    // Using an intentional error to see the columns or querying rpc/sql is not possible here
    // but we can use the 'select' with a non-existent column to see what Postgres complains about.
    const { data, error } = await supabase
        .from('mCliente')
        .select('non_existent_column');
    
    if (error) {
        console.log('Error hint usually contains columns:', error.message);
    }
}

test();
