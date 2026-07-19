"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }, // digunakan oleh trigger untuk isi profiles.full_name
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Semak E-mel Anda</h1>
          <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center' }}>
            Kami dah hantar pautan pengesahan ke <strong>{email}</strong>. Sila klik pautan tu untuk aktifkan akaun sebelum log masuk.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <form onSubmit={handleSignup} style={cardStyle}>
        <h1 style={titleStyle}>🕋 Daftar Akaun 30 Juzuk</h1>

        <input
          type="text"
          placeholder="Nama Penuh"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="email"
          placeholder="E-mel"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Kata Laluan (min. 6 aksara)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={inputStyle}
        />

        {error && <p style={{ color: '#dc2626', fontSize: '13px', margin: 0 }}>{error}</p>}

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Sedang daftar...' : 'Daftar'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', margin: 0 }}>
          Dah ada akaun? <a href="/login" style={{ color: '#0f766e', fontWeight: 600 }}>Log Masuk</a>
        </p>
      </form>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f8fafc',
  fontFamily: '"Inter", sans-serif',
  padding: '20px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  padding: '32px',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
  width: '100%',
  maxWidth: '380px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
};

const titleStyle: React.CSSProperties = {
  color: '#0f766e',
  textAlign: 'center',
  fontWeight: 700,
  fontSize: '24px',
  margin: '0 0 8px 0',
};

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '14px',
  outline: 'none',
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#0f766e',
  color: '#ffffff',
  fontWeight: 600,
  fontSize: '14px',
  cursor: 'pointer',
};
