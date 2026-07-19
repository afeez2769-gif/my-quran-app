"use client";
import { useEffect, useState } from 'react';

export default function Home() {
  const [surahs, setSurahs] = useState<any[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<any>(null);
  const [verses, setVerses] = useState<any[]>([]);
  const [translations, setTranslations] = useState<any[]>([]);
  const [loadingVerses, setLoadingVerses] = useState<boolean>(false);

  // --- BAHARU: kawalan Papar Terjemahan & Mode Hafazan -------------------
  const [showTranslation, setShowTranslation] = useState<boolean>(true);
  const [hafazanMode, setHafazanMode] = useState<boolean>(false);
  // simpan id ayat yang sudah "dibuka" (tekan untuk jelaskan) dalam Mode Hafazan
  const [revealedAyahs, setRevealedAyahs] = useState<Set<number>>(new Set());

  const toggleReveal = (verseId: number) => {
    setRevealedAyahs((prev) => {
      const next = new Set(prev);
      if (next.has(verseId)) {
        next.delete(verseId);
      } else {
        next.add(verseId);
      }
      return next;
    });
  };
  // -------------------------------------------------------------------------

  // 1. Ambil senarai surah
  useEffect(() => {
    fetch('https://api.quran.com/api/v4/chapters?language=ms')
      .then(res => res.json())
      .then(data => setSurahs(data.chapters || []))
      .catch(err => console.error(err));
  }, []);

  // 2. Ambil Ayat (Tajweed Berwarna) + Terjemahan Malaysia
  const handleSurahClick = (surah: any) => {
    setSelectedSurah(surah);
    setVerses([]);
    setTranslations([]);
    setRevealedAyahs(new Set()); // reset status hafazan bila tukar surah
    setLoadingVerses(true);

    // BAHARU: guna endpoint uthmani_tajweed — pulangkan HTML tajweed terus
    // (bukan uthmani biasa), jadi tak perlu imej / parser tambahan
    const fetchArabic = fetch(`https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number=${surah.id}`)
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

      {/* BAHARU: warna rasmi tajweed — diletak sebagai global style supaya
          terpakai pada HTML dari dangerouslySetInnerHTML (<tajweed class=...>) */}
      <style jsx global>{`
        @font-face {
          font-family: 'UthmanicHafs';
          src: url('https://verses.quran.foundation/fonts/quran/hafs/uthmanic_hafs/UthmanicHafs1Ver18.woff2') format('woff2'),
               url('https://verses.quran.foundation/fonts/quran/hafs/uthmanic_hafs/UthmanicHafs1Ver18.ttf') format('truetype');
          font-display: swap;
        }
        tajweed[class="ham_wasl"],
        tajweed[class="slnt"],
        tajweed[class="laam_shamsiyah"] { color: #AAAAAA; }
        tajweed[class="madda_normal"] { color: #537FFF; }
        tajweed[class="madda_permissible"] { color: #4050FF; }
        tajweed[class="madda_necessary"] { color: #000EBC; }
        tajweed[class="madda_obligatory"] { color: #2144C1; }
        tajweed[class="qalqalah"] { color: #DD0008; }
        tajweed[class="ikhafa_shafawi"] { color: #D500B7; }
        tajweed[class="ikhafa"] { color: #9400A8; }
        tajweed[class="idgham_shafawi"] { color: #58B800; }
        tajweed[class="iqlab"] { color: #26BFFD; }
        tajweed[class="idgham_ghunnah"] { color: #169777; }
        tajweed[class="idgham_no_ghunnah"] { color: #169200; }
        tajweed[class="idgham_mutajanisayn"],
        tajweed[class="idgham_mutaqaribayn"] { color: #A1A1A1; }
        tajweed[class="ghunnah"] { color: #FF7E1E; }
      `}</style>

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

            {/* BAHARU: togol Papar Terjemahan & Mode Hafazan */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowTranslation((v) => !v)}
                disabled={hafazanMode}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid #0f766e',
                  backgroundColor: showTranslation && !hafazanMode ? '#0f766e' : '#ffffff',
                  color: showTranslation && !hafazanMode ? '#ffffff' : '#0f766e',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: hafazanMode ? 'not-allowed' : 'pointer',
                  opacity: hafazanMode ? 0.5 : 1,
                }}
              >
                {showTranslation ? '✓ ' : ''}Papar Terjemahan
              </button>

              <button
                onClick={() => {
                  setHafazanMode((v) => !v);
                  setRevealedAyahs(new Set()); // mula semula blur bila togol mode
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid #b45309',
                  backgroundColor: hafazanMode ? '#b45309' : '#ffffff',
                  color: hafazanMode ? '#ffffff' : '#b45309',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {hafazanMode ? '✓ ' : ''}Mode Hafazan
              </button>
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
                const isRevealed = revealedAyahs.has(verse.id);
                const isBlurred = hafazanMode && !isRevealed;

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
                      {hafazanMode && (
                        <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>
                          {isRevealed ? 'Tekan untuk blur semula' : 'Tekan untuk semak'}
                        </span>
                      )}
                    </div>

                    {/* BAHARU: teks Arab tajweed terus dari API, blur dalam Mode Hafazan */}
                    <div
                      dir="rtl"
                      onClick={() => hafazanMode && toggleReveal(verse.id)}
                      style={{
                        fontSize: '32px',
                        fontFamily: "'UthmanicHafs', serif",
                        lineHeight: '2.5',
                        textAlign: 'right',
                        direction: 'rtl',
                        filter: isBlurred ? 'blur(8px)' : 'none',
                        cursor: hafazanMode ? 'pointer' : 'default',
                        userSelect: isBlurred ? 'none' : 'auto',
                        transition: 'filter 0.25s ease',
                      }}
                      dangerouslySetInnerHTML={{ __html: verse.text_uthmani_tajweed }}
                    />

                    {/* Terjemahan Melayu — disorok automatik dalam Mode Hafazan */}
                    {showTranslation && !hafazanMode && (
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
                    )}
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
