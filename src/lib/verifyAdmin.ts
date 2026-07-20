// lib/verifyAdmin.ts
//
// Sahkan token pengguna (dari header Authorization: Bearer <token>) dan pastikan
// e-mel dia sepadan dengan ADMIN_EMAIL. Guna dalam setiap API route /api/admin/*.

import { supabaseAdmin } from './supabaseAdmin';

export async function verifyAdmin(request: Request): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return { ok: false, status: 401, message: 'Tiada token log masuk.' };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return { ok: false, status: 401, message: 'Token tidak sah.' };
  }

  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail || data.user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    return { ok: false, status: 403, message: 'Akses ditolak — bukan admin.' };
  }

  return { ok: true };
}
