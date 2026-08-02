'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { computeQiblaBearing } from '@/lib/prayertimes';

export default function KiblatPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session?.user);
      setAuthChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session?.user);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const [bearing, setBearing] = useState<number | null>(null);
  const [heading, setHeading] = useState(0);
  const [status, setStatus] = useState<{ text: string; type: 'idle' | 'ok' | 'err' }>({ text: 'Tekan butang untuk mula', type: 'idle' });
  const [loading, setLoading] = useState(false);
  const needleRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (needleRef.current && bearing !== null) {
      needleRef.current.style.transform = `rotate(${bearing - heading}deg)`;
    }
  }, [bearing, heading]);

  function handleOrientation(e: DeviceOrientationEvent & { webkitCompassHeading?: number }) {
    let h: number | undefined;
    if (e.webkitCompassHeading !== undefined) h = e.webkitCompassHeading;
    else if (e.alpha !== null) h = 360 - e.alpha;
    if (h !== undefined) setHeading(h);
  }

  function startCompass() {
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (DOE && typeof DOE.requestPermission === 'function') {
      DOE.requestPermission().then((res) => {
        if (res === 'granted') window.addEventListener('deviceorientation', handleOrientation as EventListener, true);
      }).catch(() => {});
    } else if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    } else if ('DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation as EventListener, true);
    }
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      setStatus({ text: 'Geolokasi tidak disokong.', type: 'err' });
      return;
    }
    setLoading(true);
    setStatus({ text: 'Mengesan lokasi...', type: 'idle' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const b = computeQiblaBearing(latitude, longitude);
        setBearing(b);
        setStatus({ text: 'Sudut kiblat dari Utara sebenar', type: 'ok' });
        startCompass();
        setLoading(false);
      },
      () => {
        setStatus({ text: 'Gagal dapatkan lokasi.', type: 'err' });
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const ticks = Array.from({ length: 72 }, (_, i) => i);

  if (!authChecked) {
    return <div className="screen"><style>{css}</style><p style={{ textAlign: 'center', paddingTop: '60px', color: '#6f7d76' }}>Memeriksa log masuk...</p></div>;
  }

  if (!authed) {
    return (
      <div className="screen">
        <style>{css}</style>
        <header>
          <Link className="back" href="/">←</Link>
          <h1>Arah Kiblat</h1>
        </header>
        <div className="card login-gate">
          <div className="login-gate-icon">🧭</div>
          <div className="login-gate-title">Log masuk untuk buka kompas</div>
          <p className="login-gate-text">Arah kiblat memerlukan akses lokasi peribadi anda — sila log masuk dahulu untuk meneruskan.</p>
          <Link className="login-gate-btn" href="/login">Log Masuk</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <style>{css}</style>
      <header>
        <Link className="back" href="/">←</Link>
        <h1>Arah Kiblat</h1>
      </header>

      <div className="card">
        <div className="compass-wrap">
          <svg viewBox="0 0 300 300" className="compass-svg">
            <circle cx="150" cy="150" r="148" fill="rgba(244,241,230,0.04)" stroke="rgba(212,162,78,0.35)" strokeWidth="1" />
            {ticks.map((i) => {
              const major = i % 9 === 0;
              const len = major ? 18 : 12;
              return (
                <line
                  key={i}
                  x1="150" y1="18" x2="150" y2={18 + len}
                  stroke={major ? 'rgba(244,241,230,0.55)' : 'rgba(244,241,230,0.3)'}
                  strokeWidth={major ? 2.5 : 2}
                  transform={`rotate(${i * 5} 150 150)`}
                />
              );
            })}
            <text x="150" y="34" textAnchor="middle" className="dir-label-svg n">U</text>
            <text x="266" y="156" textAnchor="middle" className="dir-label-svg">T</text>
            <text x="150" y="278" textAnchor="middle" className="dir-label-svg">S</text>
            <text x="34" y="156" textAnchor="middle" className="dir-label-svg">B</text>

            <g ref={needleRef} style={{ transformOrigin: '150px 150px' }}>
              <polygon points="150,40 165,110 150,95 135,110" fill="#e6c07f" />
              <rect x="146" y="95" width="8" height="90" rx="3" fill="rgba(244,241,230,0.4)" />
            </g>

            <rect x="132" y="132" width="36" height="36" rx="6" fill="#0d0d0d" stroke="#d4a24e" strokeWidth="2" />
            <text x="150" y="157" textAnchor="middle" fontSize="20">🕋</text>
          </svg>
        </div>

        <div className="angle">{bearing !== null ? bearing.toFixed(1) : '--'}<span>°</span></div>
        <div className={`status ${status.type}`}>{status.text}</div>
        <button onClick={detectLocation} disabled={loading}>
          {bearing !== null ? 'Kesan Semula' : 'Kesan Lokasi Saya'}
        </button>
      </div>

      <p className="note"><b>Nota:</b> Sudut diukur dari Utara sebenar, ikut arah jam. Kalibrasi kompas telefon anda untuk hasil lebih tepat.</p>
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
:root{ --bg:#eef2ea; --card:#0f1f16; --card-2:#16281d; --gold:#d4a24e; --gold-soft:#e6c07f; --cream:#f4f1e6; --muted-on-dark:#8fa196; --muted:#6f7d76; --line: rgba(15,31,22,0.08); }
.screen{ font-family:'Inter',sans-serif; color:#12241a; max-width:420px; margin:0 auto; padding:22px 18px 40px; background:var(--bg); min-height:100vh; }
header{ display:flex; align-items:center; gap:14px; margin-bottom:20px; }
.back{ width:38px;height:38px;border-radius:50%; background:#fff; border:1px solid var(--line); display:flex;align-items:center;justify-content:center; text-decoration:none; color:#12241a; font-size:18px; }
header h1{ font-family:'Amiri',serif; font-size:22px; margin:0; color:#132018; }
.card{ background:linear-gradient(165deg, var(--card), var(--card-2)); border-radius:26px; padding:26px 20px 30px; position:relative; overflow:hidden; box-shadow:0 20px 40px -18px rgba(15,31,22,0.5); display:flex; flex-direction:column; align-items:center; }
.compass-wrap{ position:relative; width:min(72vw,270px); height:min(72vw,270px); margin:12px 0 22px; z-index:1; }
.compass-svg{ width:100%; height:100%; display:block; overflow:visible; }
.compass-svg g{ transition:transform 0.4s cubic-bezier(.2,.7,.3,1); transform:rotate(0deg); }
.dir-label-svg{ fill:var(--cream); font-size:13px; font-weight:700; font-family:'Inter',sans-serif; }
.dir-label-svg.n{ fill:var(--gold-soft); }
.angle{ font-family:'Amiri',serif; font-size:40px; color:var(--cream); z-index:1; line-height:1; }
.angle span{ font-size:18px; color:var(--gold); font-weight:700; }
.status{ font-size:13px; color:var(--muted-on-dark); margin-top:6px; z-index:1; min-height:18px; }
.status.ok{ color:var(--gold-soft); font-weight:600; }
.status.err{ color:#e6897a; }
button{ margin-top:20px; background:var(--gold); color:#1b1206; border:none; padding:13px 28px; border-radius:999px; font-family:'Inter',sans-serif; font-weight:700; font-size:14px; cursor:pointer; z-index:1; transition:transform 0.15s ease, background 0.2s ease; }
button:disabled{ opacity:0.5; cursor:default; transform:none; }
.note{ margin-top:20px; font-size:12.5px; color:var(--muted); text-align:center; line-height:1.5; }
.note b{ color:#8a6420; }
.login-gate{ align-items:center; text-align:center; padding:40px 24px; }
.login-gate-icon{ font-size:36px; margin-bottom:12px; }
.login-gate-title{ font-family:'Amiri',serif; font-size:19px; color:var(--cream); margin-bottom:8px; }
.login-gate-text{ font-size:13px; color:var(--muted-on-dark); line-height:1.6; margin:0 0 20px; max-width:260px; }
.login-gate-btn{ background:var(--gold); color:#1b1206; text-decoration:none; font-weight:700; font-size:14px; padding:12px 30px; border-radius:999px; }
`;
