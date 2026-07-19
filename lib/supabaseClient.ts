// lib/supabaseClient.ts
//
// Satu instance Supabase client dikongsi di seluruh app.
// Guna client-side sahaja (sepadan dengan gaya app sedia ada — semua "use client").

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
