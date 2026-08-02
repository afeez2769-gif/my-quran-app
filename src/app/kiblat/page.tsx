'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { computeQiblaBearing } from '@/lib/prayertimes';

export default function KiblatPage() {
  const [bearing, setBearing] = useState<number | null>(null);
  const [heading, setHeading] = useState(0);
  const [status, setStatus] = useState<{ text: string; type: 'idle' | 'ok' | 'err' }>({ text: 'Tekan butang untuk mula', type: 'idle' });
  const [loading, setLoading] = useState(false);
  const needleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (needleRef.current && bearing !== null) {
      needleRef.current.style.transform = `translate(-50%,-50%) rotate(${bearing - heading}deg)`;
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

  return (
    <div className="screen">
      <style>{css}</style>
      <header>
        <Link className="back" href="/">←</Link>
        <h1>Arah Kiblat</h1>
      </header>

      <div className="card">
        <div className="compass-wrap">
          <div className="ring">
            {ticks.map((i) => (
              <div key={i} className={`tick${i % 9 === 0 ? ' major' : ''}`} style={{ transform: `translate(-50%,-50%) rotate(${i * 5}deg)` }} />
            ))}
            <span className="dir-label n">U</span>
            <span className="dir-label e">T</span>
            <span className="dir-label s">S</span>
            <span className="dir-label w">B</span>
          </div>
          <div className="needle" ref={needleRef}>
            <svg className="arrow" viewBox="0 0 24 196">
              <polygon points="12,0 24,54 12,40 0,54" fill="#e6c07f" />
              <rect x="10" y="40" width="4" height="136" fill="rgba(244,241,230,0.4)" rx="2" />
            </svg>
          </div>
          <div className="kaaba">🕋</div>
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
.ring{ position:absolute; inset:0; border-radius:50%; background:rgba(244,241,230,0.04); box-shadow: 0 0 0 1px rgba(212,162,78,0.35), inset 0 0 0 6px rgba(244,241,230,0.04); }
.tick{ position:absolute; left:50%; top:50%; width:2px; height:10px; background:rgba(244,241,230,0.3); transform-origin:50% 125px; }
.tick.major{ height:16px; width:2.5px; background:rgba(244,241,230,0.55); }
.dir-label{ position:absolute; font-size:12px; font-weight:700; color:var(--cream); letter-spacing:0.05em; }
.n{ top:16px; left:50%; transform:translateX(-50%); color:var(--gold-soft); }
.e{ top:50%; right:12px; transform:translateY(-50%); }
.s{ bottom:16px; left:50%; transform:translateX(-50%); }
.w{ top:50%; left:12px; transform:translateY(-50%); }
.needle{ position:absolute; left:50%; top:50%; transform:translate(-50%,-50%) rotate(0deg); transition:transform 0.4s cubic-bezier(.2,.7,.3,1); }
.needle .arrow{ position:absolute; left:-12px; top:-98px; width:24px; height:196px; }
.kaaba{ position:absolute; left:50%; top:50%; width:24px;height:24px; transform:translate(-50%,-50%); background:linear-gradient(160deg,#1b1b1b,#000); border:2px solid var(--gold); border-radius:3px; box-shadow:0 0 12px rgba(212,162,78,0.5); z-index:5; display:flex; align-items:center; justify-content:center; font-size:10px; }
.angle{ font-family:'Amiri',serif; font-size:40px; color:var(--cream); z-index:1; line-height:1; }
.angle span{ font-size:18px; color:var(--gold); font-weight:700; }
.status{ font-size:13px; color:var(--muted-on-dark); margin-top:6px; z-index:1; min-height:18px; }
.status.ok{ color:var(--gold-soft); font-weight:600; }
.status.err{ color:#e6897a; }
button{ margin-top:20px; background:var(--gold); color:#1b1206; border:none; padding:13px 28px; border-radius:999px; font-family:'Inter',sans-serif; font-weight:700; font-size:14px; cursor:pointer; z-index:1; transition:transform 0.15s ease, background 0.2s ease; }
button:disabled{ opacity:0.5; cursor:default; transform:none; }
.note{ margin-top:20px; font-size:12.5px; color:var(--muted); text-align:center; line-height:1.5; }
.note b{ color:#8a6420; }
`;
        
