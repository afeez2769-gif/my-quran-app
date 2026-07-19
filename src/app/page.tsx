"use client";
import { useEffect, useState } from 'react';

export default function Home() {
  const [surahs, setSurahs] = useState<any[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<any>(null);
  const [verses, setVerses] = useState<any[]>([]);
  const [translations, setTranslations] = useState<any[]>([]);
  const [loadingVerses, setLoadingVerses] = useState<boolean>(false);

  // 1. Ambil senarai surah semasa aplikasi dibuka
  useEffect(() => {
    fetch('https://api.quran.com/api/v4/chapters?language=ms')
      .then(res => res.json())
      .then(data => setSurahs(data.chapters || []))
      .catch(err => console.error(err));
  }, []);

  // 2. Fungsi apabila surah diklik (Ambil ayat Arab + Terjemahan Malaysia)
  const handleSurahClick = (surah: any) => {
    setSelectedSurah(surah);
    setVerses([]);
    setTranslations([]);
    setLoadingVerses(true);

    // Ambil Teks Arab Uthmani
    const fetchArabic = fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surah.id}`)
      .then(res => res.json());

    // Ambil Terjemahan Bahasa Melayu (ID Rasm/Resource 39 atau ID standard Malaysia)
    const fetchTranslation = fetch(`https://api.quran.com/api/v4/quran/translations/39?chapter_number=${surah.id}`)
      .then(res => res.json());

    Promise.all([fetchArabic, fetchTranslation])
      .then(([arabicData, transData]) => {
        setVerses(arabicData.verses || []);
        setTranslations(transData.translations || []);
        setLoadingVerses(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingVerses(false);
      });
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '25px', fontFamily: '"Inter", sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Suntikan Link Font Digital Quran (Uthmanic) & Inter */}
      <link relstyle={{display:'none'}} href="https://fonts.googleapis.com/css2?family=Amiri&family=Inter:wght@300;400;600&family=Noto+Naskh+Arabic:wght@500&display=swap" rel="stylesheet" />

      <h1 
        style={{ color: '#0f766e', textAlign: 'center', cursor: 'pointer', fontWeight: '700', fontSize: '32px', marginBottom: '5px' }} 
        onClick={() => setSelectedSurah(null)}
      >
        🕋 My Quran App
      </h1>
      <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: 0 }}>
        {selectedSurah ? "⬅️ Klik logo untuk kembali ke senarai surah" : "Aplikasi Al-Quran Digital dengan Terjemahan Malaysia"}
      </p>
      
      <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />

      {/* ----------------- PAPARAN ISI KANDUNGAN SURAH ----------------- */}
      {selectedSurah ? (
        <div>
          {/* Header Info Surah ala Quran.com */}
          <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '25px', textAlign: 'center' }}>
            <h2 style={{ color: '#0f766e', margin: '0 0 8px 0', fontSize: '24px' }}>{selectedSurah.name_complex}</h2>
            <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
              <span>Sifat: {selectedSurah.revelation_place === 'makkah' ? 'Makkiyah' : 'Madaniyah'}</span>
              <span style={{ margin: '0 10px' }}>•</span>
              <span>{selectedSurah.verses_count} Ayat</span>
            </div>
          </div>

          {loadingVerses ? (
            <p style={{ textAlign: 'center', color: '#64748b', fontWeight: '500' }}>Sedang memuatkan ayat dan terjemahan...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Paparan Bismillah untuk semua surah kecuali Al-Taubah */}
              {selectedSurah.id !== 9 && (
                <div style={{ textDirection: 'rtl', textAlign: 'center', fontSize: '28px', fontFamily: '"Noto Naskh Arabic", "Amiri", serif', padding: '20px 0', color: '#1e293b' }}>
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </div>
              )}

              {verses.map((verse: any, index: number) => {
                // Padankan terjemahan mengikut urutan ayat
                const translationText = translations[index]?.text || "Terjemahan tidak ditemui.";
                const verseNumber = verse.verse_key.split(':')[1];

                return (
                  <div 
                    key={verse.id} 
                    style={{ 
                      backgroundColor: '#ffffff', 
                      padding: '30px', 
                      borderRadius: '12px', 
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '20px' 
                    }}
                  >
                    {/* Nombor Ayat (Label Tepi) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ backgroundColor: '#ccfbf1', color: '#0f766e', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                        {verse.verse_key}
                      </span>
                    </div>

                    {/* Teks Arab (Font Quran.com Style) */}
                    <div 
                      dir="rtl"
                      style={{ 
                        fontSize: '32px', 
                        fontFamily: '"Noto Naskh Arabic", "Amiri", serif', 
                        lineHeight: '2.5', 
                        color: '#0f172a',
                        textAlign: 'right',
                        fontWeight: '500'
                      }}
                    >
                      {verse.text_uthmani} <span style={{ fontFamily: 'sans-serif', fontSize: '20px', color: '#0f766e', marginRight: '5px' }}>﴿{verseNumber}﴾</span>
                    </div>

                    {/* Teks Terjemahan Bahasa Melayu */}
                    <div 
                      style={{ 
                        fontSize: '15px', 
                        color: '#334155', 
                        lineHeight: '1.6',
                        textAlign: 'left',
                        borderTop: '1px dashed #f1f5f9',
                        paddingTop: '15px',
                        fontWeight: '400'
                      }}
                      dangerouslySetInnerHTML={{ __html: translationText }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ----------------- PAPARAN SENARAI SURAH ----------------- */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginTop: '10px' }}>
          {surahs.map((surah) => (
            <div
              key={surah.id}
              onClick={() => handleSurahClick(surah)}
              style={{
                backgroundColor: '#ffffff',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0f766e';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(15, 118, 110, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
              }}
            >
              {/* Kotak Nombor Surah */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', backgroundColor: '#f1f5f9', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                {surah.id}
              </div>
              
              {/* Nama Surah */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '16px' }}>{surah.name_complex}</div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{surah.translated_name.name}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
