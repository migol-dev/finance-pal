import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const isSupabaseEnabled = import.meta.env.VITE_ENABLE_SUPABASE === 'true';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
