"use client";
import { useEffect, useState } from 'react';

export default function Home() {
  const [surahs, setSurahs] = useState<any[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<any>(null);
  const [verses, setVerses] = useState<any[]>([]);
  const [loadingVerses, setLoadingVerses] = useState<boolean>(false);

  // Ambil senarai surah semasa aplikasi dibuka
  useEffect(() => {
    fetch('https://api.quran.com/api/v4/chapters?language=ms')
      .then(res => res.json())
      .then(data => setSurahs(data.chapters || []))
      .catch(err => console.error(err));
  }, []);

  // Fungsi apabila surah diklik
  const handleSurahClick = (surah: any) => {
    setSelectedSurah(surah);
    setVerses([]);
    setLoadingVerses(true);

    // Ambil ayat-ayat bagi surah yang dipilih
    fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surah.id}`)
      .then(res => res.json())
      .then(data => {
        setVerses(data.verses || []);
        setLoadingVerses(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingVerses(false);
      });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#fafafa', minHeight: '100vh' }}>
      <h1 style={{ color: '#059669', textAlign: 'center', cursor: 'pointer' }} onClick={() => setSelectedSurah(null)}>
        🕋 My Quran App
      </h1>
      <p style={{ textAlign: 'center', color: '#666' }}>
        {selectedSurah ? "⬅️ Klik logo di atas untuk kembali ke senarai surah" : "Pilih surah untuk mula membaca"}
      </p>
      <hr style={{ border: '0', borderTop: '1px solid #ddd', margin: '20px 0' }} />

      {/* Bahagian 1: Paparan Ayat Surah (Jika surah dipilih) */}
      {selectedSurah ? (
        <div>
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
            <h2 style={{ color: '#059669', margin: '0 0 5px 0' }}>{selectedSurah.name_complex}</h2>
            <p style={{ color: '#666', margin: 0 }}>Nama Terjemahan: {selectedSurah.translated_name.name} | {selectedSurah.verses_count} Ayat</p>
          </div>

          {loadingVerses ? (
            <p style={{ textAlign: 'center', color: '#666' }}>Sedang memuatkan ayat...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {verses.map((verse: any) => (
                <div key={verse.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '28px', textDirection: 'rtl', textAlign: 'right', fontFamily: 'serif', lineHeight: '2.5', color: '#111827' }}>
                    {verse.text_uthmani} ﴿{verse.verse_key.split(':')[1]}﴾
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Bahagian 2: Paparan Senarai Surah */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '15px' }}>
          {surahs.map((surah) => (
            <div
              key={surah.id}
              onClick={() => handleSurahClick(surah)}
              style={{
                backgroundColor: '#fff',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#059669')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
            >
              <div style={{ fontWeight: 'bold', color: '#111827' }}>{surah.id}. {surah.name_complex}</div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{surah.translated_name.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
