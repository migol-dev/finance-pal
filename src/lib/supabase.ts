import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

function getSyncEnabled(): boolean {
  try {
    if (localStorage.getItem('finance-pal-sync-disabled') === 'true') return false;
  } catch { /* ignore */ }
  return import.meta.env.VITE_ENABLE_SUPABASE === 'true';
}

export let isSupabaseEnabled = getSyncEnabled();

/** Toggle cloud sync at runtime. Updates localStorage and the exported `isSupabaseEnabled` flag. Page reload recommended after calling. */
export function setSyncEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.removeItem('finance-pal-sync-disabled');
    } else {
      localStorage.setItem('finance-pal-sync-disabled', 'true');
    }
  } catch { /* ignore */ }
  isSupabaseEnabled = enabled;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
