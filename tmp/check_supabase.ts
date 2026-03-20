import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Hỗ trợ cả 2 naming convention: VITE_* (vite.config.ts) và NEXT_PUBLIC_* (.env.local)
const supabaseUrl = process.env.VITE_SUPABASE_URL
  || process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = ['users', 'refund_requests', 'basedata', 'chats', 'messages', 'audit_logs', 'config'];

async function checkDatabase() {
  console.log('Checking Supabase Database...');
  for (const table of tables) {
    const { data, count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact' });
    
    if (error) {
       console.log(`- ${table}: Error [${error.code}] ${error.message}`);
    } else {
       console.log(`- ${table}: ${count} rows`);
       if (data && data.length > 0) {
         if (table === 'config') {
           console.log(`  Support phone: ${data[0].support_phone || 'N/A'}`);
           console.log(`  Brand name:    ${data[0].brand_name || 'N/A'}`);
         } else {
           console.log(`  Sample: ${JSON.stringify(data[0]).substring(0, 120)}...`);
         }
       }
    }
  }
}

checkDatabase();
