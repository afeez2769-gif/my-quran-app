import { NextRequest, NextResponse } from 'next/server';

// Route ni jalan di SERVER (bukan browser), jadi tiada isu CORS bila panggil
// API pihak ketiga api.waktusolat.app. Frontend cuma panggil /api/azan sendiri.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const long = searchParams.get('long');

  if (!lat || !long) {
    return NextResponse.json({ error: 'lat dan long diperlukan' }, { status: 400 });
  }

  try {
    const zoneRes = await fetch(`https://api.waktusolat.app/zones/gps?lat=${lat}&long=${long}`, {
      next: { revalidate: 3600 }, // cache zon 1 jam — zon lokasi jarang berubah
    });
    if (!zoneRes.ok) {
      const detail = await zoneRes.text().catch(() => '');
      return NextResponse.json({ error: 'Zon tidak dijumpai untuk lokasi ini', status: zoneRes.status, detail }, { status: 404 });
    }
    const zoneData = await zoneRes.json();
    const zone = zoneData.zone as string;
    if (!zone) {
      return NextResponse.json({ error: 'Respons zon tidak lengkap', zoneData }, { status: 502 });
    }

    const solatRes = await fetch(`https://api.waktusolat.app/v2/solat/${zone}`, {
      next: { revalidate: 3600 * 6 }, // cache jadual bulanan 6 jam
    });
    if (!solatRes.ok) {
      const detail = await solatRes.text().catch(() => '');
      return NextResponse.json(
        { error: 'Jadual waktu solat tidak dijumpai untuk zon ini', zone, status: solatRes.status, detail },
        { status: 404 }
      );
    }
    const solatData = await solatRes.json();

    const todayDay = new Date().getDate();
    const entry = solatData.prayers?.find((p: any) => p.day === todayDay) || null;

    return NextResponse.json({
      zone,
      district: zoneData.district,
      state: zoneData.state,
      times: entry,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal hubungi pelayan waktu solat' }, { status: 502 });
  }
}
