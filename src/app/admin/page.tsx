"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // borang e-mel pukal
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  useEffect(() => {
    checkAccessAndLoadStats();
  }, []);

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  };

  const checkAccessAndLoadStats = async () => {
    setChecking(true);
    const token = await getAccessToken();

    if (!token) {
      setChecking(false);
      setAuthorized(false);
      return;
    }

    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        setAuthorized(true);
      } else {
        setAuthorized(false);
      }
    } catch {
      setAuthorized(false);
    }
    setChecking(false);
    setLoadingStats(false);
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendResult(null);
    setErrorMsg('');

    const token = await getAccessToken();
    if (!token) {
      setErrorMsg('Sesi log masuk tamat, sila log masuk semula.');
      setSending(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();

      if (res.ok) {
        setSendResult(data);
        setSubject('');
        setMessage('');
      } else {
        setErrorMsg(data.error || 'Gagal menghantar e-mel.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    }

    setSending(false);
  };

  if (checking) {
    return (
      <div style={pageStyle}>
        <p style={{ color: '#64748b' }}>Sedang semak akses...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={{ color: '#dc2626', fontSize: '20px', margin: '0 0 10px 0' }}>🚫 Akses Ditolak</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Halaman ni khas untuk admin sahaja. Sila log masuk dengan akaun admin.
          </p>
          <a href="/login" style={{ color: '#0f766e', fontWeight: 600, fontSize: '14px' }}>Log Masuk →</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '25px', fontFamily: '"Inter", sans-serif', minHeight: '100vh' }}>
      <a href="/" style={{ fontSize: '13px', color: '#64748b', textDecoration: 'none' }}>⬅️ Kembali ke 30 Juzuk</a>

      <h1 style={{ color: '#0f766e', fontSize: '26px', margin: '16px 0 24px 0' }}>🛠️ Panel Admin</h1>

      {/* Statistik */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '30px' }}>
        <StatCard label="Jumlah Pengguna" value={stats?.totalUsers ?? '—'} />
        <StatCard label="Ayat Ditanda Master" value={stats?.totalAyahMastered ?? '—'} />
      </div>

      {/* Borang Broadcast E-mel */}
      <h2 style={{ fontSize: '17px', color: '#0f172a', margin: '0 0 12px 0' }}>📧 Hantar E-mel kepada Semua Pengguna</h2>
      <form onSubmit={handleSendBroadcast} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px' }}>
        <input
          type="text"
          placeholder="Tajuk e-mel"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          style={inputStyle}
        />
        <textarea
          placeholder="Tulis mesej di sini..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={6}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />

        {errorMsg && <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{errorMsg}</p>}

        {sendResult && (
          <p style={{ color: '#16a34a', fontSize: '13px', margin: 0 }}>
            ✓ Berjaya hantar kepada {sendResult.sentCount} / {sendResult.totalRecipients} pengguna
          </p>
        )}

        <button
          type="submit"
          disabled={sending}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#0f766e',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '14px',
            cursor: sending ? 'wait' : 'pointer',
            opacity: sending ? 0.6 : 1,
          }}
        >
          {sending ? 'Menghantar...' : `Hantar kepada ${stats?.totalUsers ?? 0} pengguna`}
        </button>
      </form>

      {/* Senarai Pengguna */}
      <h2 style={{ fontSize: '17px', color: '#0f172a', margin: '0 0 12px 0' }}>👥 Senarai Pengguna</h2>
      <div style={cardStyle}>
        {loadingStats ? (
          <p style={{ color: '#64748b', fontSize: '13px' }}>Memuatkan...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats?.users?.map((u: any) => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span>{u.email} {!u.confirmed && <span style={{ color: '#f59e0b' }}>(belum sah)</span>}</span>
                <span style={{ color: '#94a3b8' }}>{new Date(u.created_at).toLocaleDateString('ms-MY')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ ...cardStyle, textAlign: 'center' }}>
      <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f766e' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
  fontFamily: '"Inter", sans-serif',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  padding: '20px',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
};

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '14px',
  outline: 'none',
};
