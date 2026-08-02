'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPrayerTimes, formatTime, PrayerTimesResult } from '@/lib/prayertimes';

export default function JadualPage() {
  const [times, setTimes] = useState<PrayerTimesResult | null>(null);
  const [dateLine, setDateLine] = useState('—');
  const [activeKey, setActiveKey] = useState<string>('isha');

  useEffect(() => {
    const now = new Date();
    setDateLine(now.toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));

    const applyTimes = (lat: number, lng: number, tz: number) => {
      const t = getPrayerTimes(now, lat, lng, tz);
      setTimes(t);
      const nowHours = now.getHours() + now.getMinutes() / 60;
      const order: (keyof PrayerTimesResult)[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      let current = 'isha';
      order.forEach((k) => { if (t[k] <= nowHours) current = k; });
      setActiveKey(current);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const tz = -new Date().getTimezoneOffset() / 60;
          applyTimes(pos.coords.latitude, pos.coords.longitude, tz);
        },
        () => applyTimes(3.139, 101.6869, 8)
      );
    } else {
      applyTimes(3.139, 101.6869, 8);
    }
  }, []);

  const rows: { key: keyof PrayerTimesResult; label: string }[] = [
    { key: 'fajr', label: 'Subuh' },
    { key: 'sunrise', label: 'Syuruk' },
    { key: 'dhuhr', label: 'Zohor' },
    { key: 'asr', label: 'Asar' },
    { key: 'maghrib', label: 'Maghrib' },
    { key: 'isha', label: 'Isyak' },
  ];

  return (
    <div className="screen">
      <style>{css}</style>
      <header>
        <Link className="back" href="/">←</Link>
        <h1>Jadual Waktu Solat</h1>
      </header>
      <div className="date-line">{dateLine}</div>

      <div className="list">
        {rows.map((r) => (
          <div key={r.key} className={`row${r.key === activeKey ? ' active' : ''}`}>
            <div className="rname">{r.label}</div>
            <div className="rtime">{times ? formatTime(times[r.key]) : '--:--'}</div>
          </div>
        ))}
      </div>

      <div className="jemaah-note">
        <b>Waktu jemaah</b> di masjid/surau berhampiran akan dipaparkan di sini kelak — buat masa ini jadual menunjukkan waktu solat mengikut kiraan astronomi untuk lokasi anda.
      </div>
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
:root{ --bg:#eef2ea; --card:#0f1f16; --card-2:#16281d; --gold:#d4a24e; --gold-soft:#e6c07f; --cream:#f4f1e6; --muted-on-dark:#8fa196; --muted:#6f7d76; --line:rgba(15,31,22,0.08); }
.screen{ font-family:'Inter',sans-serif; color:#12241a; max-width:420px; margin:0 auto; padding:22px 18px 40px; background:var(--bg); min-height:100vh; }
header{ display:flex; align-items:center; gap:14px; margin-bottom:20px; }
.back{ width:38px;height:38px;border-radius:50%; background:#fff; border:1px solid var(--line); display:flex;align-items:center;justify-content:center; text-decoration:none; color:#12241a; font-size:18px; }
header h1{ font-family:'Amiri',serif; font-size:22px; margin:0; color:#132018; }
.date-line{ font-size:13px; color:var(--muted); margin-bottom:18px; padding-left:2px; }
.list{ background:linear-gradient(165deg, var(--card), var(--card-2)); border-radius:22px; overflow:hidden; box-shadow:0 20px 40px -18px rgba(15,31,22,0.5); }
.row{ display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid rgba(244,241,230,0.06); }
.row:last-child{ border-bottom:none; }
.row.active{ background:rgba(212,162,78,0.1); }
.rname{ font-size:15px; font-weight:600; color:var(--cream); }
.rtime{ font-size:16px; font-weight:700; color:var(--gold-soft); }
.row.active .rtime{ color:var(--gold); }
.jemaah-note{ margin-top:20px; background:#fff; border:1px solid var(--line); border-radius:16px; padding:16px 18px; font-size:13px; color:var(--muted); line-height:1.6; }
.jemaah-note b{ color:#12241a; }
`;
      
