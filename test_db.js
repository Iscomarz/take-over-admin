import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://koubjdnhazjtykkmalfw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvdWJqZG5oYXpqdHlra21hbGZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU5MjA2NTYsImV4cCI6MjA0MTQ5NjY1Nn0.oWcXG_M4EC5_nw6gchqN6LHujrxIn-nzPvpPsdEGsDc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('--- Testing mCliente table ---');
    const { data: cData, error: cError } = await supabase
        .from('mCliente')
        .select('*')
        .limit(1);
    
    if (cError) {
        console.error('Error querying mCliente:', cError);
    } else {
        console.log('Sample data from mCliente:', cData);
        if (cData && cData.length > 0) {
            console.log('Columns found in mCliente:', Object.keys(cData[0]));
        } else {
             console.log('mCliente is empty');
        }
    }

    console.log('\n--- Testing mVenta columns ---');
    const { data: vData, error: vError } = await supabase
        .from('mVenta')
        .select('*')
        .limit(1);
    
    if (vError) {
        console.error('Error querying mVenta:', vError);
    } else {
        console.log('Sample data from mVenta:', vData);
        if (vData && vData.length > 0) {
            console.log('Columns found in mVenta:', Object.keys(vData[0]));
        }
    }
}

test();
