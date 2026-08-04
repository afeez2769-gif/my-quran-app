import { NextRequest, NextResponse } from 'next/server';

// Route ni jalan di SERVER (bukan browser) — tiada isu CORS bila panggil
// api.waktusolat.app. Untuk elak endpoint /zones/gps yang tak stabil,
// kita padankan nama daerah (dari reverse-geocode) dengan senarai zon JAKIM sendiri.

type ZoneEntry = { jakimCode: string; negeri: string; daerah: string };

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/^daerah\s+/, '')
    .replace(/^bandar\s+/, '')
    .replace(/^wilayah persekutuan\s+/, '')
    .trim();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const long = searchParams.get('long');

  if (!lat || !long) {
    return NextResponse.json({ error: 'lat dan long diperlukan' }, { status: 400 });
  }

  try {
    // 1) Reverse-geocode koordinat -> nama daerah/negeri
    const geoRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${long}&localityLanguage=ms`
    );
    if (!geoRes.ok) {
      return NextResponse.json({ error: 'Gagal cari nama lokasi' }, { status: 502 });
    }
    const geo = await geoRes.json();
    const district: string = geo.locality || geo.city || '';
    const state: string = geo.principalSubdivision || '';
    const label = (district || state || 'Lokasi Anda').toUpperCase();

    // 2) Tarik senarai penuh zon JAKIM
    const zonesRes = await fetch('https://api.waktusolat.app/zones', {
      next: { revalidate: 3600 * 24 }, // senarai zon jarang berubah — cache sehari
    });
    if (!zonesRes.ok) {
      return NextResponse.json({ error: 'Gagal tarik senarai zon JAKIM' }, { status: 502 });
    }
    const zones: ZoneEntry[] = await zonesRes.json();

    const districtNorm = normalize(district);
    const stateNorm = normalize(state);

    // Padan ikut daerah dulu (paling tepat)
    let match = zones.find((z) =>
      z.daerah.split(',').some((d) => normalize(d) === districtNorm)
    );
    // Kalau tiada padanan tepat, cuba substring
    if (!match && districtNorm) {
      match = zones.find((z) => normalize(z.daerah).includes(districtNorm));
    }
    // Fallback: padan ikut negeri sahaja (ambil zon pertama untuk negeri tu)
    if (!match) {
      match = zones.find((z) => normalize(z.negeri) === stateNorm);
    }

    if (!match) {
      return NextResponse.json(
        { error: 'Tiada zon JAKIM sepadan untuk lokasi ini', district, state },
        { status: 404 }
      );
    }

    const zone = match.jakimCode;

    // 3) Tarik jadual waktu solat bulan semasa untuk zon tu
    const solatRes = await fetch(`https://api.waktusolat.app/v2/solat/${zone}`, {
      next: { revalidate: 3600 * 6 },
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
      district: match.daerah,
      state: match.negeri,
      locLabel: label,
      times: entry,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal hubungi pelayan waktu solat' }, { status: 502 });
  }
}
