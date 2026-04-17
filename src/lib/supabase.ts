import { createClient } from '@supabase/supabase-js'

// En production, Vercel injecte ses propres variables spécifiques au projet relié
const supabaseUrl = 
  (import.meta as any).env.VITE_SUPABASE_URL || 
  (import.meta as any).env.NEXT_PUBLIC_encore1dessert_SUPABASE_URL ||
  (import.meta as any).env.encore1dessert_SUPABASE_URL

const supabaseAnonKey = 
  (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 
  (import.meta as any).env.NEXT_PUBLIC_encore1dessert_SUPABASE_ANON_KEY ||
  (import.meta as any).env.encore1dessert_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Check your .env file.")
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
