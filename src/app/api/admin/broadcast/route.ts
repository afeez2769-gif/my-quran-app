// app/api/admin/broadcast/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { verifyAdmin } from '../../../../lib/verifyAdmin';

export async function POST(request: Request) {
  const check = await verifyAdmin(request);
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: check.status });
  }

  const { subject, message } = await request.json();

  if (!subject || !message) {
    return NextResponse.json({ error: 'Tajuk dan mesej wajib diisi.' }, { status: 400 });
  }

  // Dapatkan semua e-mel pengguna berdaftar
  const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000,
  });

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const emails = usersData.users.map((u) => u.email).filter((e): e is string => !!e);

  if (emails.length === 0) {
    return NextResponse.json({ error: 'Tiada pengguna untuk dihantar e-mel.' }, { status: 400 });
  }

  // Resend hadkan sehingga ~50 penerima setiap panggilan API — pecahkan ikut kelompok
  const BATCH_SIZE = 45;
  const batches: string[][] = [];
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    batches.push(emails.slice(i, i + BATCH_SIZE));
  }

  let sentCount = 0;
  const errors: string[] = [];

  for (const batch of batches) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: process.env.RESEND_FROM_EMAIL ? batch : [batch[0]], // guna 'to' ramai hanya bila domain sendiri disahkan
          bcc: process.env.RESEND_FROM_EMAIL ? undefined : batch, // fallback: guna bcc kalau masih guna domain ujian
          subject,
          html: `<div style="font-family: sans-serif; font-size: 15px; line-height: 1.6; color: #0f172a;">${message.replace(/\n/g, '<br/>')}</div>`,
        }),
      });

      if (res.ok) {
        sentCount += batch.length;
      } else {
        const errBody = await res.text();
        errors.push(errBody);
      }
    } catch (err: any) {
      errors.push(err.message);
    }
  }

  return NextResponse.json({
    sentCount,
    totalRecipients: emails.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
