"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Teks tajweed Bismillah — dikongsi antara paparan surah biasa & Mode Mushaf
const BISMILLAH_HTML =
  'بِسْمِ <tajweed class="ham_wasl">ٱ</tajweed>للَّهِ <tajweed class="ham_wasl">ٱ</tajweed><tajweed class="laam_shamsiyah">ل</tajweed>رَّحْمَ<tajweed class="madda_normal">ـٰ</tajweed>نِ <tajweed class="ham_wasl">ٱ</tajweed><tajweed class="laam_shamsiyah">ل</tajweed>رَّح<tajweed class="madda_permissible">ِي</tajweed>مِ';

export default function Home() {
  const [surahs, setSurahs] = useState<any[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<any>(null);
  const [verses, setVerses] = useState<any[]>([]);
  const [translations, setTranslations] = useState<any[]>([]);
  const [loadingVerses, setLoadingVerses] = useState<boolean>(false);

  // --- BAHARU: Mode Mushaf baris-tepat (data tempatan dari QUL, bukan API) ---
  const [mushafMode, setMushafMode] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>('1');
  const [mushafLayout, setMushafLayout] = useState<any[] | null>(null); // semua 9046 baris (dimuat sekali sahaja)
  const [mushafWords, setMushafWords] = useState<string[] | null>(null); // semua 83668 perkataan (dimuat sekali sahaja)
  const [loadingMushafData, setLoadingMushafData] = useState<boolean>(false);

  // muat layout.json & words.json SEKALI sahaja apabila Mode Mushaf dibuka buat pertama kali
  useEffect(() => {
    if (mushafMode && !mushafLayout) {
      setLoadingMushafData(true);
      Promise.all([
        fetch('/quran-data/layout.json').then(res => res.json()),
        fetch('/quran-data/words.json').then(res => res.json()),
      ])
        .then(([layoutData, wordsData]) => {
          setMushafLayout(layoutData);
          setMushafWords(wordsData);
          setLoadingMushafData(false);
        })
        .catch(err => {
          console.error(err);
          setLoadingMushafData(false);
        });
    }
  }, [mushafMode, mushafLayout]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const openMushafMode = () => {
    setSelectedSurah(null);
    setMushafMode(true);
  };

  const goToPage = (page: number) => {
    const clamped = Math.min(604, Math.max(1, page));
    setCurrentPage(clamped);
  };

  // baris untuk muka surat semasa sahaja (ditapis dari layout penuh)
  const currentPageLines = mushafLayout
    ? mushafLayout.filter((line: any) => line.p === currentPage).sort((a: any, b: any) => a.l - b.l)
    : [];
  // -------------------------------------------------------------------------

  // --- BAHARU: status log masuk & progress hafazan -----------------------
  const [user, setUser] = useState<any>(null);
  // simpan nombor ayat yang dah ditanda "master" untuk surah semasa
  const [masteredAyahs, setMasteredAyahs] = useState<Set<number>>(new Set());
  const [savingAyah, setSavingAyah] = useState<number | null>(null); // elak double-click semasa simpan

  useEffect(() => {
    // semak sesi log masuk semasa app pertama kali load
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    // dengar perubahan status log masuk (login/logout) di mana-mana bahagian app
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ambil senarai ayat yang dah "master" untuk surah + user semasa
  const fetchMasteredAyahs = async (surahId: number, userId: string) => {
    const { data, error } = await supabase
      .from('hafazan_progress')
      .select('ayah_number')
      .eq('user_id', userId)
      .eq('surah_number', surahId)
      .eq('status', 'master');

    if (error) {
      console.error(error);
      return;
    }
    setMasteredAyahs(new Set((data || []).map((row: any) => row.ayah_number)));
  };

  // togol status master untuk satu ayat (tekan untuk tanda, tekan lagi untuk buang tanda)
  const toggleMastered = async (surahId: number, ayahNumber: number) => {
    if (!user) return;
    setSavingAyah(ayahNumber);

    const alreadyMastered = masteredAyahs.has(ayahNumber);

    if (alreadyMastered) {
      // buang rekod (kembali ke "sedang belajar")
      const { error } = await supabase
        .from('hafazan_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('surah_number', surahId)
        .eq('ayah_number', ayahNumber);

      if (!error) {
        setMasteredAyahs((prev) => {
          const next = new Set(prev);
          next.delete(ayahNumber);
          return next;
        });
      }
    } else {
      // upsert: tambah baharu ATAU kemaskini kalau dah ada rekod (contoh status lama 'sedang_belajar')
      const { error } = await supabase
        .from('hafazan_progress')
        .upsert(
          {
            user_id: user.id,
            surah_number: surahId,
            ayah_number: ayahNumber,
            status: 'master',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,surah_number,ayah_number' }
        );

      if (!error) {
        setMasteredAyahs((prev) => new Set(prev).add(ayahNumber));
      }
    }

    setSavingAyah(null);
  };
  // -------------------------------------------------------------------------

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
    setMasteredAyahs(new Set());
    setLoadingVerses(true);

    if (user) {
      fetchMasteredAyahs(surah.id, user.id);
    }

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
        tajweed[class="madda_obligatory"],
        tajweed[class="madda_obligatory_mottasel"],
        tajweed[class="madda_obligatory_monfasel"] { color: #2144C1; }
        tajweed[class="qalqalah"],
        tajweed[class="qalaqah"] { color: #DD0008; }
        tajweed[class="ikhafa_shafawi"] { color: #D500B7; }
        tajweed[class="ikhafa"] { color: #9400A8; }
        tajweed[class="idgham_shafawi"] { color: #58B800; }
        tajweed[class="iqlab"] { color: #26BFFD; }
        tajweed[class="idgham_ghunnah"] { color: #169777; }
        tajweed[class="idgham_no_ghunnah"],
        tajweed[class="idgham_wo_ghunnah"] { color: #169200; }
        tajweed[class="idgham_mutajanisayn"],
        tajweed[class="idgham_mutaqaribayn"] { color: #A1A1A1; }
        tajweed[class="ghunnah"] { color: #FF7E1E; }

        /* BAHARU: gaya untuk Mode Mushaf baris-tepat.
           font-size guna clamp() supaya automatik mengecil ikut lebar skrin
           (26px di skrin lebar, susut ke 15px di skrin telefon sempit).
           overflow-x:auto (bukan hidden) supaya kalau MASIH tak muat pun,
           ayat boleh di-scroll — TAK PERNAH hilang/terlindung terus. */
        .mushaf-line {
          font-family: 'UthmanicHafs', serif;
          font-size: clamp(15px, 5.2vw, 26px);
          line-height: 2.4;
          direction: rtl;
          white-space: nowrap;
          overflow-x: auto;
          overflow-y: hidden;
          scrollbar-width: none; /* Firefox: sorok scrollbar tapi kekal boleh scroll */
          -ms-overflow-style: none;
        }
        .mushaf-line::-webkit-scrollbar { display: none; } /* Chrome/Safari: sorok scrollbar */
        .mushaf-line--justify { text-align: justify; text-align-last: justify; }
        .mushaf-line--center { text-align: center; }

        @media (max-width: 480px) {
          .mushaf-line { line-height: 2.1; }
          .mushaf-box { padding: 18px 10px !important; }
        }
      `}</style>


      {/* BAHARU: status log masuk di penjuru kanan atas */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#64748b' }}>
            <span>👤 {user.email}</span>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Log Keluar
            </button>
          </div>
        ) : (
          <a
            href="/login"
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: '#0f766e',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Log Masuk
          </a>
        )}
      </div>

      <h1
        style={{ color: '#0f766e', textAlign: 'center', cursor: 'pointer', fontWeight: '700', fontSize: '32px', marginBottom: '5px' }}
        onClick={() => { setSelectedSurah(null); setMushafMode(false); }}
      >
        🕋 My Quran App
      </h1>
      <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: 0 }}>
        {selectedSurah ? "⬅️ Klik logo untuk kembali ke senarai surah" : "Al-Quran Digital dengan Tajwid Berwarna & Terjemahan Malaysia"}
      </p>

      {/* BAHARU: butang akses Mode Mushaf — hanya nampak di halaman senarai surah */}
      {!mushafMode && !selectedSurah && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
          <button
            onClick={openMushafMode}
            style={{
              padding: '10px 20px',
              borderRadius: '20px',
              border: '1px solid #0f766e',
              backgroundColor: '#ffffff',
              color: '#0f766e',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📖 Mode Mushaf — Baca Ikut Muka Surat Sebenar
          </button>
        </div>
      )}

      <hr style={{ border: '0', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />

      {/* ----------------- MODE MUSHAF (604 muka surat) ----------------- */}
      {mushafMode ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <button
              onClick={() => setMushafMode(false)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⬅️ Keluar Mode Mushaf
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                style={{
                  padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff', color: '#0f766e', fontWeight: 600,
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: currentPage <= 1 ? 0.4 : 1,
                }}
              >
                ◀
              </button>

              <form
                onSubmit={(e) => { e.preventDefault(); goToPage(Number(pageInput)); }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <input
                  type="number"
                  min={1}
                  max={604}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  style={{ width: '60px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}
                />
                <span style={{ fontSize: '13px', color: '#64748b' }}>/ 604</span>
              </form>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= 604}
                style={{
                  padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff', color: '#0f766e', fontWeight: 600,
                  cursor: currentPage >= 604 ? 'not-allowed' : 'pointer', opacity: currentPage >= 604 ? 0.4 : 1,
                }}
              >
                ▶
              </button>
            </div>
          </div>

          {loadingMushafData ? (
            <p style={{ textAlign: 'center', color: '#64748b', fontWeight: '500' }}>Sedang memuatkan data mushaf (sekali sahaja, lepas ni pantas)...</p>
          ) : (
            <div className="mushaf-box" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '30px 25px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              {currentPageLines.map((line: any, idx: number) => {
                if (line.t === 'surah_name') {
                  const surahInfo = surahs.find((s: any) => s.id === line.s);
                  return (
                    <div key={idx} style={{ textAlign: 'center', margin: '16px 0', fontFamily: '"Inter", sans-serif' }}>
                      <div style={{ display: 'inline-block', padding: '6px 24px', border: '1px solid #0f766e', borderRadius: '8px', color: '#0f766e', fontWeight: 700, fontSize: '17px' }}>
                        {surahInfo?.name_complex || `Surah ${line.s}`}
                      </div>
                    </div>
                  );
                }

                if (line.t === 'basmallah') {
                  return (
                    <div
                      key={idx}
                      dir="rtl"
                      className="mushaf-line mushaf-line--center"
                      style={{ margin: '10px 0' }}
                      dangerouslySetInnerHTML={{ __html: BISMILLAH_HTML }}
                    />
                  );
                }

                // line.t === 'ayah'
                const lineWords = mushafWords && line.f && line.e
                  ? mushafWords.slice(line.f - 1, line.e)
                  : [];
                const lineHtml = lineWords.join(' ');

                return (
                  <div
                    key={idx}
                    dir="rtl"
                    className={`mushaf-line ${line.c ? 'mushaf-line--center' : 'mushaf-line--justify'}`}
                    dangerouslySetInnerHTML={{ __html: lineHtml }}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : selectedSurah ? (
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

              {/* BAHARU: Bismillah dipaparkan guna teks tajweed sendiri (bukan imej luar
                  yang boleh rosak/404) — konsisten dengan font & warna ayat lain */}
              {selectedSurah.id !== 9 && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 20px 0' }}>
                  <div
                    dir="rtl"
                    style={{
                      fontSize: '28px',
                      fontFamily: "'UthmanicHafs', serif",
                      textAlign: 'center',
                    }}
                    dangerouslySetInnerHTML={{ __html: BISMILLAH_HTML }}
                  />
                </div>
              )}

              {verses.map((verse: any, index: number) => {
                const translationText = translations[index]?.text || "Terjemahan tidak ditemui.";
                const verseNumber = verse.verse_key.split(':')[1];
                const isRevealed = revealedAyahs.has(verse.id);
                const isBlurred = hafazanMode && !isRevealed;
                const isMastered = masteredAyahs.has(Number(verseNumber));
                const isSaving = savingAyah === Number(verseNumber);

                return (
                  <div
                    key={verse.id}
                    style={{
                      backgroundColor: '#ffffff',
                      padding: '30px',
                      borderRadius: '12px',
                      border: isMastered ? '1px solid #16a34a' : '1px solid #e2e8f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ backgroundColor: '#ccfbf1', color: '#0f766e', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                        Ayat {verse.verse_key}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {hafazanMode && (
                          <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>
                            {isRevealed ? 'Tekan untuk blur semula' : 'Tekan untuk semak'}
                          </span>
                        )}

                        {/* BAHARU: butang Tandakan Master — hanya nampak bila user log masuk */}
                        {user && (
                          <button
                            onClick={() => toggleMastered(selectedSurah.id, Number(verseNumber))}
                            disabled={isSaving}
                            style={{
                              padding: '4px 12px',
                              borderRadius: '20px',
                              border: isMastered ? '1px solid #16a34a' : '1px solid #cbd5e1',
                              backgroundColor: isMastered ? '#16a34a' : '#ffffff',
                              color: isMastered ? '#ffffff' : '#475569',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: isSaving ? 'wait' : 'pointer',
                              opacity: isSaving ? 0.6 : 1,
                            }}
                          >
                            {isMastered ? '✓ Master' : 'Tandakan Master'}
                          </button>
                        )}
                      </div>
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
