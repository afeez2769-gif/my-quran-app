"use client";
import { useEffect, useState } from 'react';

export default function AboutPage() {
  // BAHARU: baca Mod Malam dari localStorage supaya konsisten dengan halaman utama
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('darkMode') : null;
    if (saved === 'true') setDarkMode(true);
  }, []);

  const theme = {
    bg: darkMode ? '#0f172a' : '#f8fafc',
    card: darkMode ? '#1e293b' : '#ffffff',
    border: darkMode ? '#334155' : '#e2e8f0',
    text: darkMode ? '#e5e7eb' : '#0f172a',
    textMuted: darkMode ? '#94a3b8' : '#64748b',
    accent: '#0f766e',
  };

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '25px', fontFamily: '"Inter", sans-serif', backgroundColor: theme.bg, minHeight: '100vh', color: theme.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet" />

      <a
        href="/"
        style={{
          display: 'inline-block',
          marginBottom: '20px',
          fontSize: '13px',
          color: theme.textMuted,
          textDecoration: 'none',
        }}
      >
        ⬅️ Kembali ke 30 Juzuk
      </a>

      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>🕋</div>
        <h1 style={{ color: theme.accent, fontSize: '28px', fontWeight: 700, margin: '0 0 6px 0' }}>
          30 Juzuk
        </h1>
        <p style={{ color: theme.textMuted, fontSize: '14px', margin: 0 }}>
          Al-Quran Digital — Tajwid Berwarna, Terjemahan Melayu & Bantuan Hafazan
        </p>
      </div>

      {/* Mukadimah */}
      <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
        <p style={{ fontSize: '15px', lineHeight: '1.8', margin: 0, color: theme.text }}>
          <strong>30 Juzuk</strong> dibina untuk memudahkan sesiapa sahaja membaca, memahami, dan
          menghafaz Al-Quran — dengan tajwid berwarna yang tepat, terjemahan Bahasa Melayu, dan
          alat bantu hafazan yang praktikal. Sesuai untuk bacaan harian, ulangkaji (murajaah), atau
          sesi hafazan baharu.
        </p>
      </div>

      {/* Ciri-ciri */}
      <h2 style={{ fontSize: '18px', color: theme.accent, margin: '30px 0 14px 0' }}>✨ Ciri-ciri Utama</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <FeatureCard
          theme={theme}
          icon="🎨"
          title="Tajwid Berwarna"
          desc="Setiap hukum tajwid (mad, ikhfa', idgham, qalqalah, dan lain-lain) dipaparkan dalam warna berbeza mengikut skema warna rasmi, supaya senang dikenal pasti semasa membaca."
        />
        <FeatureCard
          theme={theme}
          icon="🇲🇾"
          title="Terjemahan Bahasa Melayu"
          desc="Terjemahan penuh 114 surah dalam Bahasa Melayu, boleh ditogol tunjuk/sorok ikut keperluan."
        />
        <FeatureCard
          theme={theme}
          icon="🙈"
          title="Mode Hafazan"
          desc="Teks Arab di-blur secara automatik — tekan ayat untuk jelaskan semula. Cara mudah untuk uji hafazan sendiri tanpa bantuan visual."
        />
        <FeatureCard
          theme={theme}
          icon="✅"
          title="Tandakan Master"
          desc="Tanda ayat yang dah dikuasai (perlukan log masuk). Status disimpan terus ke akaun anda, boleh disemak bila-bila masa."
        />
        <FeatureCard
          theme={theme}
          icon="📖"
          title="Mode Mushaf"
          desc="Baca ikut susun-atur 604 muka surat SEBENAR (sama seperti mushaf cetak) — baris demi baris tepat, lengkap dengan penanda Juzuk dan nama surah. Data disimpan terus dalam aplikasi, tidak bergantung pada sambungan luar semasa membaca."
        />
        <FeatureCard
          theme={theme}
          icon="🔍"
          title="Navigasi Pantas"
          desc="Lompat terus ke mana-mana surah atau muka surat, tanpa perlu skrol panjang."
        />
        <FeatureCard
          theme={theme}
          icon="🌙"
          title="Mod Malam"
          desc="Paparan gelap untuk bacaan waktu malam yang lebih selesa pada mata, termasuk warna tajwid yang disesuaikan supaya kekal jelas dibaca."
        />
      </div>

      {/* Sumber Data */}
      <h2 style={{ fontSize: '18px', color: theme.accent, margin: '30px 0 14px 0' }}>📚 Sumber Data</h2>
      <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '24px' }}>
        <p style={{ fontSize: '14px', lineHeight: '1.8', color: theme.textMuted, margin: '0 0 12px 0' }}>
          Teks Al-Quran, tajwid, dan susun-atur mushaf diperoleh daripada sumber terbuka yang disemak
          dan digunakan secara meluas oleh pembangun aplikasi Islamik di seluruh dunia:
        </p>
        <ul style={{ fontSize: '14px', lineHeight: '2', color: theme.textMuted, margin: 0, paddingLeft: '20px' }}>
          <li><strong style={{ color: theme.text }}>Quran.com API</strong> — teks Uthmani, tajwid berwarna, dan terjemahan</li>
          <li><strong style={{ color: theme.text }}>Quranic Universal Library (QUL)</strong> oleh Tarteel — susun-atur baris mushaf sebenar (604 muka surat)</li>
        </ul>
      </div>

      {/* BAHARU: Sokong Kami — sumbangan penyelenggaraan */}
      <h2 style={{ fontSize: '18px', color: theme.accent, margin: '30px 0 14px 0' }}>💛 Sokong Kami</h2>
      <div style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '28px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', lineHeight: '1.8', color: theme.textMuted, margin: '0 0 20px 0' }}>
          30 Juzuk dibangun dan diselenggara secara sukarela demi memudahkan urusan membaca dan
          menghafaz Al-Quran untuk semua. Kos hosting, domain, dan penambahbaikan berterusan
          ditanggung sendiri oleh pembangun. Jika aplikasi ini memberi manfaat kepada anda,
          sumbangan seikhlas hati amat dihargai untuk memastikan 30 Juzuk terus beroperasi dan
          bertambah baik dari semasa ke semasa — semoga menjadi sedekah jariah buat kita bersama. 🤲
        </p>

        <img
          src="/donation-qr.png"
          alt="QR Kod DuitNow untuk sumbangan"
          style={{ width: '220px', maxWidth: '100%', borderRadius: '12px', border: `1px solid ${theme.border}` }}
        />

        <p style={{ fontSize: '12px', color: theme.textMuted, marginTop: '14px' }}>
          Imbas kod QR di atas menggunakan aplikasi perbankan/e-dompet anda
        </p>
      </div>

      {/* Nota */}
      <p style={{ fontSize: '12px', color: theme.textMuted, textAlign: 'center', marginTop: '30px', lineHeight: '1.7' }}>
        Al-Quran adalah kalam Allah SWT. Kami berusaha memastikan ketepatan teks dan tajwid,
        namun sekiranya terjumpa sebarang kesilapan, sila maklumkan kepada kami untuk pembetulan.
        <br />
        Terjemahan adalah bantuan pemahaman sahaja dan tidak boleh menggantikan rujukan tafsir yang muktabar.
      </p>
    </div>
  );
}

function FeatureCard({
  theme,
  icon,
  title,
  desc,
}: {
  theme: { card: string; border: string; text: string; textMuted: string; accent: string };
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div style={{
      backgroundColor: theme.card,
      border: `1px solid ${theme.border}`,
      borderRadius: '12px',
      padding: '18px 20px',
      display: 'flex',
      gap: '14px',
      alignItems: 'flex-start',
    }}>
      <div style={{ fontSize: '24px', lineHeight: 1 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '15px', color: theme.text, marginBottom: '4px' }}>{title}</div>
        <div style={{ fontSize: '13px', color: theme.textMuted, lineHeight: '1.6' }}>{desc}</div>
      </div>
    </div>
  );
}
