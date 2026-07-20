// lib/supabaseAdmin.ts
//
// PENTING: fail ni guna SERVICE ROLE KEY — key ni ada kuasa PENUH ke database
// (langkau semua RLS). JANGAN sesekali import fail ni dalam komponen "use client",
// dan JANGAN letak NEXT_PUBLIC_ di depan nama env variable dia — hanya guna dalam
// API routes (fail dalam folder app/api/) yang jalan di server sahaja.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
