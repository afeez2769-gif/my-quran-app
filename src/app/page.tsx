"use client";
import { useEffect, useState } from 'react';

export default function Home() {
  const [surahs, setSurahs] = useState<any[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<any>(null);
  const [verses, setVerses] = useState<any[]>([]);
  const [translations, setTranslations] = useState<any[]>([]);
  const [loadingVerses, setLoadingVerses] = useState<boolean>(false);

  // 1. Ambil senarai surah
  useEffect(() => {
    fetch('https://api.quran.com/api/v4/chapters?language=ms')
      .then(res => res.json())
      .then(data => setSurahs(data.chapters || []))
      .catch(err => console.error(err));
  }, []);

  // 2. Ambil Ayat + Terjemahan Malaysia
  const handleSurahClick = (surah: any) => {
    setSelectedSurah(surah);
    setVerses([]);
    setTranslations([]);
    setLoadingVerses(true);

    // Ambil data ayat standard untuk dapatkan susunan ayat
    const fetchArabic = fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surah.id}`)
      .then(res => res.json());

    // Ambil Terjemahan Bahasa Melayu
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
      
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet" />

      <h1 
        style={{ color: '#0f766e', textAlign: 'center', cursor: 'pointer', fontWeight: '700', fontSize: '32px', marginBottom: '5px' }} 
        onClick={() => setSelectedSurah(null)}
      >
        🕋 My Quran App
      </h1>
      <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: 0 }}>
        {selectedSurah ? "⬅️ Klik logo untuk kembali ke senarai surah" : "Al-Quran Digital dengan Tajwid Berwarna & Terjemahan Malaysia"}
      </p>
      
      <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />

      {/* ----------------- PAPARAN ISI KANDUNGAN SURAH ----------------- */}
      {selectedSurah ? (
        <div>
          {/* Header Info Surah */}
          <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '25px', textAlign: 'center' }}>
            <h2 style={{ color: '#0f766e', margin: '0 0 8px 0', fontSize: '24px' }}>{selectedSurah.name_complex}</h2>
            <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
              <span>{selectedSurah.revelation_place === 'makkah' ? 'Makkiyah' : 'Madaniyah'}</span>
              <span style={{ margin: '0 10px' }}>•</span>
              <span>{selectedSurah.verses_count} Ayat</span>
            </div>
          </div>

          {loadingVerses ? (
            <p style={{ textAlign: 'center', color: '#64748b', fontWeight: '500' }}>Sedang memuatkan tajwid berwarna...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              
              {/* Paparan Bismillah Versi Imej Cantik dari Quran.com */}
              {selectedSurah.id !== 9 && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                  <img 
                    src="https://quran.com/images/bismillah.svg" 
                    alt="Bismillah" 
                    style={{ width: '280px', height: 'auto', filter: 'invert(31%) sepia(45%) saturate(795%) hue-rotate(125deg) brightness(95%) contrast(92%)' }} 
                  />
                </div>
              )}

              {verses.map((verse: any, index: number) => {
                const translationText = translations[index]?.text || "Terjemahan tidak ditemui.";
                const verseNumber = verse.verse_key.split(':')[1];

                // Membina URL imej tajwid rasmi untuk setiap ayat dari quran.com
                const tajweedImageUrl = `https://cstatic.quran.com/images/tajweed/${selectedSurah.id}/${verseNumber}.png`;

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
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ backgroundColor: '#ccfbf1', color: '#0f766e', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                        Ayat {verse.verse_key}
                      </span>
                    </div>

                    {/* Memaparkan Imej Tajwid Asli dari Quran.com (Tidak akan pecah & warna tajwid 100% tepat) */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 0' }}>
                      <img 
                        src={tajweedImageUrl} 
                        alt={`Ayat ${verseNumber}`} 
                        style={{ maxWidth: '100%', height: 'auto', minHeight: '50px', objectFit: 'contain' }} 
                        onError={(e) => {
                          // Jika imej gagal dimuatkan, ia akan paparkan teks biasa sebagai backup
                          e.currentTarget.style.display = 'none';
                          const fallbackText = document.getElementById(`fallback-${verse.id}`);
                          if (fallbackText) fallbackText.style.display = 'block';
                        }}
                      />
                      {/* Teks backup jika internet lambat loading imej */}
                      <div 
                        id={`fallback-${verse.id}`}
                        dir="rtl"
                        style={{ display: 'none', fontSize: '32px', fontFamily: 'serif', lineHeight: '2.5', textAlign: 'right', direction: 'rtl' }}
                      >
                        {verse.text_uthmani} ﴿{verseNumber}﴾
                      </div>
                    </div>

                    {/* Terjemahan Melayu */}
                    <div 
                      style={{ 
                        fontSize: '15px', 
                        color: '#334155', 
                        lineHeight: '1.6',
                        borderTop: '1px dashed #e2e8f0',
                        paddingTop: '15px',
                        textAlign: 'left'
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
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', backgroundColor: '#f1f5f9', borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: '#475569' }}>
                {surah.id}
              </div>
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
