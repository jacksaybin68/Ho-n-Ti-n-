import { createClient } from '@supabase/supabase-js';

// Vite inyects these via the 'define' block in vite.config.ts as literal strings
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found. Please set them in .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
