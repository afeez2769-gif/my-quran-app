'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

const ZIKIR_LIST = [
  'Subhanallah',
  'Alhamdulillah',
  'Allahu Akbar',
  'La ilaha illallah',
  'Astaghfirullah',
  'Selawat ke atas Nabi',
  'La hawla wala quwwata illa billah',
  'Isi sendiri...',
];

export default function TasbihPage() {
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


  const [darkMode, setDarkMode] = useState(false);
  const [zikir, setZikir] = useState('');
  const [customZikir, setCustomZikir] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [count, setCount] = useState(0);
  const [pulse, setPulse] = useState(false);
  const doneRef = useRef(false);

  const activeZikirName = zikir === 'Isi sendiri...' ? (customZikir || 'Zikir') : zikir;
  const target = typeof amount === 'number' ? amount : 0;
  const canStart = activeZikirName.trim().length > 0 && target > 0;

  function pickPreset(n: number) {
    setAmount(n);
  }

  function handleTap() {
    if (doneRef.current) return;
    const next = count + 1;
    setCount(next);
    setPulse(true);
    setTimeout(() => setPulse(false), 150);
    if (navigator.vibrate) navigator.vibrate(next >= target ? [40, 30, 40] : 15);
    if (next >= target) doneRef.current = true;
  }

  function reset() {
    setCount(0);
    doneRef.current = false;
  }

  function backToSetup() {
    setStarted(false);
    setCount(0);
    doneRef.current = false;
  }

  const progress = target > 0 ? Math.min(count / target, 1) : 0;

  if (!authChecked) {
    return <div className="screen"><style>{css}</style><p style={{ textAlign: 'center', paddingTop: '60px', color: '#6f7d76' }}>Memeriksa log masuk...</p></div>;
  }

  if (!authed) {
    return (
      <div className="screen">
        <style>{css}</style>
        <header>
          <Link className="icon-btn" href="/">←</Link>
          <div className="title-block">
            <div className="eyebrow">Penghitung Dzikir</div>
            <h1>Penghitung Digital</h1>
          </div>
          <div style={{ width: 40 }} />
        </header>
        <div className="login-gate">
          <div className="login-gate-icon">📿</div>
          <div className="login-gate-title">Log masuk untuk guna Tasbih Zikir</div>
          <p className="login-gate-text">Sila log masuk dahulu untuk menyimpan dan menggunakan penghitung dzikir.</p>
          <Link className="login-gate-btn" href="/login">Log Masuk</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`screen ${darkMode ? 'dark' : ''}`}>
      <style>{css}</style>

      {!started && (
        <>
          <header>
            <Link className="icon-btn" href="/">←</Link>
            <div className="title-block">
              <div className="eyebrow">Penghitung Dzikir</div>
              <h1>Penghitung Digital</h1>
            </div>
            <div className="icon-btn" onClick={() => setDarkMode((v) => !v)}>☾</div>
          </header>

          <div className="preset-row">
            {[33, 99, 100].map((n) => (
              <button key={n} className={`preset${amount === n ? ' active' : ''}`} onClick={() => pickPreset(n)}>
                {n}×
              </button>
            ))}
          </div>

          <div className="field dropdown-field">
            <button className="dropdown-trigger" onClick={() => setDropdownOpen((v) => !v)}>
              <span className={zikir ? 'filled' : 'placeholder'}>{zikir || 'Pilih Dzikir'}</span>
              <span className={`chevron${dropdownOpen ? ' open' : ''}`}>⌄</span>
            </button>
            {dropdownOpen && (
              <div className="dropdown-menu">
                {ZIKIR_LIST.map((z) => (
                  <div key={z} className="dropdown-item" onClick={() => { setZikir(z); setDropdownOpen(false); }}>
                    {z}
                  </div>
                ))}
              </div>
            )}
          </div>

          {zikir === 'Isi sendiri...' && (
            <div className="field">
              <input
                className="text-input"
                placeholder="Taip zikir anda"
                value={customZikir}
                onChange={(e) => setCustomZikir(e.target.value)}
              />
            </div>
          )}

          <div className="field">
            <input
              className="text-input"
              type="number"
              placeholder="Jumlah Dzikir"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
            />
          </div>

          <button className={`mulai-btn${canStart ? ' ready' : ''}`} disabled={!canStart} onClick={() => setStarted(true)}>
            MULAI
          </button>

          <div className="info-card">
            <div className="info-title">CARA PAKAI</div>
            <p>Pilih dzikir atau isi sendiri, tentukan jumlah, lalu tekan Mulai. Ketuk lingkaran besar untuk menghitung. Getaran akan aktif sebagai feedback.</p>
          </div>
        </>
      )}

      {started && (
        <>
          <header>
            <div className="icon-btn" onClick={backToSetup}>←</div>
            <div className="title-block">
              <div className="eyebrow">{activeZikirName}</div>
              <h1>{count} / {target}</h1>
            </div>
            <div className="icon-btn" onClick={() => setDarkMode((v) => !v)}>☾</div>
          </header>

          <div className="counter-wrap">
            <div
              className={`tap-circle${pulse ? ' pulse' : ''}${count >= target ? ' complete' : ''}`}
              style={{ ['--progress' as any]: progress }}
              onClick={handleTap}
            >
              <div className="tap-inner">
                <div className="tap-count">{count}</div>
                <div className="tap-label">{count >= target ? 'Selesai ✓' : 'Ketuk'}</div>
              </div>
            </div>
          </div>

          <button className="reset-btn" onClick={reset}>Set Semula</button>
        </>
      )}
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
:root{ --bg:#eef2ea; --gold:#c9963f; --gold-soft:#e6c07f; --green:#1f3d2e; --muted:#6f7d76; --line:rgba(31,61,46,0.1); --card:#ffffff; }
.screen{ font-family:'Inter',sans-serif; color:#1a2b22; max-width:420px; margin:0 auto; padding:22px 18px 40px; background:var(--bg); min-height:100vh; transition:background 0.3s ease, color 0.3s ease; }
.screen.dark{ --bg:#0f1b14; --card:#16281d; --line:rgba(244,241,230,0.1); --muted:#8fa196; color:#f4f1e6; }

header{ display:flex; align-items:center; justify-content:space-between; margin-bottom:22px; }
.icon-btn{ width:40px;height:40px;border-radius:50%; background:var(--card); border:1px solid var(--line); display:flex;align-items:center;justify-content:center; text-decoration:none; color:inherit; font-size:17px; cursor:pointer; flex-shrink:0; }
.title-block{ text-align:center; flex:1; }
.eyebrow{ font-size:11px; font-weight:700; letter-spacing:0.16em; color:var(--gold); text-transform:uppercase; }
.title-block h1{ font-family:'Amiri',serif; font-size:21px; margin:2px 0 0; }

.preset-row{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:16px; }
.preset{ background:var(--card); border:1px solid var(--line); border-radius:16px; padding:16px 0; font-size:16px; font-weight:600; color:inherit; cursor:pointer; transition:border-color 0.2s ease, transform 0.15s ease; }
.preset:hover{ transform:translateY(-1px); }
.preset.active{ border-color:var(--gold); color:var(--gold); background:rgba(201,150,63,0.08); }

.field{ margin-bottom:14px; position:relative; }
.dropdown-field{ z-index:5; }
.dropdown-trigger{ width:100%; text-align:left; background:var(--card); border:1px solid var(--line); border-radius:16px; padding:16px 18px; font-size:15px; color:inherit; display:flex; justify-content:space-between; align-items:center; cursor:pointer; }
.dropdown-trigger .placeholder{ color:var(--muted); }
.chevron{ transition:transform 0.2s ease; color:var(--muted); font-size:16px; }
.chevron.open{ transform:rotate(180deg); }
.dropdown-menu{ position:absolute; top:calc(100% + 6px); left:0; right:0; background:var(--card); border:1px solid var(--line); border-radius:16px; overflow:hidden; box-shadow:0 12px 28px -12px rgba(0,0,0,0.2); }
.dropdown-item{ padding:14px 18px; font-size:14px; cursor:pointer; border-bottom:1px solid var(--line); }
.dropdown-item:last-child{ border-bottom:none; }
.dropdown-item:hover{ background:rgba(201,150,63,0.08); }

.text-input{ width:100%; background:var(--card); border:1px solid var(--line); border-radius:16px; padding:16px 18px; font-size:15px; color:inherit; box-sizing:border-box; }
.text-input::placeholder{ color:var(--muted); }
.text-input:focus{ outline:none; border-color:var(--gold); }

.mulai-btn{ width:100%; padding:16px; border-radius:16px; border:none; background:rgba(120,130,120,0.18); color:var(--muted); font-weight:700; letter-spacing:0.08em; font-size:14px; cursor:not-allowed; margin-bottom:20px; }
.mulai-btn.ready{ background:var(--green); color:#f4f1e6; cursor:pointer; }
.screen.dark .mulai-btn.ready{ background:var(--gold); color:#1b1206; }

.info-card{ background:rgba(201,150,63,0.12); border:1px solid rgba(201,150,63,0.3); border-radius:18px; padding:16px 18px; }
.info-title{ font-size:11px; font-weight:700; letter-spacing:0.14em; color:var(--gold); margin-bottom:8px; }
.info-card p{ font-size:13px; line-height:1.6; margin:0; color:inherit; opacity:0.85; }

.counter-wrap{ display:flex; justify-content:center; margin:40px 0 30px; }
.tap-circle{
  width:240px; height:240px; border-radius:50%;
  background: conic-gradient(var(--gold) calc(var(--progress) * 360deg), var(--line) 0deg);
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; user-select:none; -webkit-tap-highlight-color:transparent;
  transition:transform 0.1s ease;
  padding:10px;
}
.tap-circle.pulse{ transform:scale(0.96); }
.tap-circle.complete{ background:conic-gradient(#4caf7d 360deg, var(--line) 0deg); }
.tap-inner{
  width:100%; height:100%; border-radius:50%; background:var(--card);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  box-shadow:inset 0 2px 10px rgba(0,0,0,0.06);
}
.tap-count{ font-family:'Amiri',serif; font-size:56px; line-height:1; }
.tap-label{ font-size:13px; color:var(--muted); margin-top:8px; letter-spacing:0.05em; text-transform:uppercase; font-weight:600; }

.reset-btn{ display:block; margin:0 auto; background:none; border:1px solid var(--line); color:var(--muted); padding:10px 24px; border-radius:999px; font-size:13px; font-weight:600; cursor:pointer; }

.login-gate{ text-align:center; padding:50px 24px; background:var(--card); border:1px solid var(--line); border-radius:20px; }
.login-gate-icon{ font-size:36px; margin-bottom:12px; }
.login-gate-title{ font-family:'Amiri',serif; font-size:19px; margin-bottom:8px; }
.login-gate-text{ font-size:13px; color:var(--muted); line-height:1.6; margin:0 0 20px; }
.login-gate-btn{ background:var(--green); color:#f4f1e6; text-decoration:none; font-weight:700; font-size:14px; padding:12px 30px; border-radius:999px; }
.screen.dark .login-gate-btn{ background:var(--gold); color:#1b1206; }
`;
