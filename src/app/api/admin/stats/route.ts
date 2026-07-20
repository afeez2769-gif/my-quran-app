// app/api/admin/stats/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { verifyAdmin } from '../../../../lib/verifyAdmin';

export async function GET(request: Request) {
  const check = await verifyAdmin(request);
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: check.status });
  }

  // Senarai semua pengguna berdaftar (guna Admin API — perlu service role key)
  const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000,
  });

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const users = usersData.users.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    confirmed: !!u.email_confirmed_at,
  }));

  // Jumlah rekod hafazan yang ditanda "master" (merentasi semua pengguna)
  const { count: masteredCount } = await supabaseAdmin
    .from('hafazan_progress')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'master');

  return NextResponse.json({
    totalUsers: users.length,
    users: users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    totalAyahMastered: masteredCount || 0,
  });
}
