"use client";
import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

// BAHARU: Bismillah sebagai ARRAY perkataan (bukan satu string) — elak
// pemecahan ikut ruang yang boleh musnahkan tag <tajweed class="..."> sendiri
// (sebab ada ruang antara "tajweed" dan "class=..." dalam tag tu)
const BISMILLAH_WORDS = [
  'بِسْمِ',
  '<tajweed class="ham_wasl">ٱ</tajweed>للَّهِ',
  '<tajweed class="ham_wasl">ٱ</tajweed><tajweed class="laam_shamsiyah">ل</tajweed>رَّحْمَ<tajweed class="madda_normal">ـٰ</tajweed>نِ',
  '<tajweed class="ham_wasl">ٱ</tajweed><tajweed class="laam_shamsiyah">ل</tajweed>رَّح<tajweed class="madda_permissible">ِي</tajweed>مِ',
];
// versi gabungan (untuk paparan surah biasa — dangerouslySetInnerHTML terus, bukan per-perkataan)
const BISMILLAH_HTML = BISMILLAH_WORDS.join(' ');

// BAHARU: titik permulaan setiap 30 juz (muka surat + baris tepat) — dari data QUL
const JUZ_STARTS: { j: number; p: number; l: number }[] = [{"j":1,"p":1,"l":2},{"j":2,"p":22,"l":1},{"j":3,"p":42,"l":1},{"j":4,"p":62,"l":2},{"j":5,"p":82,"l":1},{"j":6,"p":102,"l":1},{"j":7,"p":121,"l":9},{"j":8,"p":142,"l":1},{"j":9,"p":162,"l":1},{"j":10,"p":182,"l":1},{"j":11,"p":201,"l":13},{"j":12,"p":222,"l":1},{"j":13,"p":242,"l":1},{"j":14,"p":262,"l":3},{"j":15,"p":282,"l":3},{"j":16,"p":302,"l":1},{"j":17,"p":322,"l":3},{"j":18,"p":342,"l":3},{"j":19,"p":362,"l":1},{"j":20,"p":382,"l":1},{"j":21,"p":402,"l":1},{"j":22,"p":422,"l":1},{"j":23,"p":442,"l":1},{"j":24,"p":462,"l":1},{"j":25,"p":482,"l":1},{"j":26,"p":502,"l":9},{"j":27,"p":522,"l":1},{"j":28,"p":542,"l":3},{"j":29,"p":562,"l":3},{"j":30,"p":582,"l":3}];

const MUSHAF_BASE_FONT_SIZE_DESKTOP = 26;
const MUSHAF_BASE_FONT_SIZE_MOBILE = 19;
const MUSHAF_MIN_FONT_SIZE = 12;

// BAHARU: tukar nombor Barat (123) ke angka Arab (١٢٣)
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toArabicNumeral(n: number): string {
  return String(n)
    .split('')
    .map((ch) => (ARABIC_DIGITS[Number(ch)] !== undefined ? ARABIC_DIGITS[Number(ch)] : ch))
    .join('');
}

function getMushafBaseFontSize() {
  if (typeof window === 'undefined') return MUSHAF_BASE_FONT_SIZE_DESKTOP;
  return window.innerWidth <= 480 ? MUSHAF_BASE_FONT_SIZE_MOBILE : MUSHAF_BASE_FONT_SIZE_DESKTOP;
}

// BAHARU: MushafLine kekal STRUKTUR ASAL yang stabil (satu senarai rata
// <span> setiap perkataan, terus jadi anak flex — TIADA pembungkus
// tambahan/segmen bersarang). Highlight & klik-per-ayat kini diletak
// TERUS pada setiap <span> perkataan itu sendiri (guna getWordState),
// supaya struktur yang diukur oleh algoritma fit() kekal 100% sama
// dengan versi yang telah disahkan stabil.
function MushafLine({
  words,
  ayahCodes,
  centered,
  blurred,
  onClick,
  getWordState,
}: {
  words: string[];
  ayahCodes?: number[]; // pilihan — kalau tiada, tiada highlight per-ayat (contoh Bismillah)
  centered: boolean;
  blurred?: boolean; // blur SELURUH baris (dipakai bila getWordState tiada, cth Bismillah)
  onClick?: () => void; // klik SELURUH baris (dipakai bila getWordState tiada, cth Bismillah)
  getWordState?: (ayahCode: number) => { blurred?: boolean; highlighted?: boolean; onClick?: () => void };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [fontSize, setFontSize] = useState(MUSHAF_BASE_FONT_SIZE_DESKTOP);
  const [useJustify, setUseJustify] = useState(false);

  const canJustify = !centered && words.length > 1;
  const wordsKey = words.join('|');

  useEffect(() => {
    let cancelled = false;

    function fit() {
      if (cancelled) return;
      const container = containerRef.current;
      if (!container) return;

      const baseSize = getMushafBaseFontSize();

      container.style.fontSize = `${baseSize}px`;
      const availableWidth = container.clientWidth;

      let totalWordsWidth = 0;
      wordRefs.current.forEach((el) => {
        if (el) totalWordsWidth += el.getBoundingClientRect().width;
      });

      if (totalWordsWidth === 0) return;

      if (totalWordsWidth <= availableWidth) {
        setFontSize(baseSize);
        setUseJustify(canJustify);
      } else {
        const ratio = availableWidth / totalWordsWidth;
        setFontSize(Math.max(MUSHAF_MIN_FONT_SIZE, baseSize * ratio));
        setUseJustify(false);
      }
    }

    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(fit);
    });

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(fit);
    }

    window.addEventListener('resize', fit);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      window.removeEventListener('resize', fit);
    };
  }, [wordsKey, canJustify]);

  return (
    <div
      ref={containerRef}
      dir="rtl"
      className="mushaf-line"
      onClick={!getWordState ? onClick : undefined}
      style={{
        display: 'flex',
        justifyContent: useJustify ? 'space-between' : 'center',
        width: '100%',
        whiteSpace: 'nowrap',
        fontSize: `${fontSize}px`,
        filter: !getWordState && blurred ? 'blur(6px)' : 'none',
        cursor: !getWordState && onClick ? 'pointer' : 'default',
        userSelect: !getWordState && blurred ? 'none' : 'auto',
        transition: 'filter 0.2s ease',
      }}
    >
      {words.map((word, i) => {
        const code = ayahCodes ? ayahCodes[i] || 0 : 0;
        const wState = getWordState && code ? getWordState(code) : undefined;
        return (
          <span
            key={i}
            ref={(el) => { wordRefs.current[i] = el; }}
            onClick={wState?.onClick}
            dangerouslySetInnerHTML={{ __html: word }}
            style={
              wState
                ? {
                    // BAHARU: garis halus di bawah (bukan latar penuh) — lebih kemas,
                    // dan walaupun ada jurang kecil antara perkataan, mata tetap baca
                    // sebagai satu garis berterusan. border-bottom cuma tambah TINGGI,
                    // langsung tak sentuh lebar — 100% selamat untuk algoritma fit().
                    borderBottom: wState.highlighted ? '2px solid rgba(22,163,74,0.3)' : '2px solid transparent',
                    filter: wState.blurred ? 'blur(6px)' : 'none',
                    cursor: wState.onClick ? 'pointer' : 'default',
                    userSelect: wState.blurred ? 'none' : 'auto',
                    transition: 'filter 0.2s ease, border-color 0.2s ease',
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}

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
  const [mushafLayout, setMushafLayout] = useState<any[] | null>(null);
  const [mushafWords, setMushafWords] = useState<string[] | null>(null);
  const [wordAyahMap, setWordAyahMap] = useState<number[] | null>(null);
  const [loadingMushafData, setLoadingMushafData] = useState<boolean>(false);

  // BAHARU: Mode Hafazan dalam Mode Mushaf — blur ikut AYAT (guna kunci "surah:ayah")
  const [mushafHafazanMode, setMushafHafazanMode] = useState<boolean>(false);
  const [mushafRevealedAyahs, setMushafRevealedAyahs] = useState<Set<string>>(new Set());
  // Bismillah pembuka (bukan ayat bernombor) — blur berasingan guna kunci baris biasa
  const [revealedLines, setRevealedLines] = useState<Set<string>>(new Set());

  const toggleRevealedAyah = (key: string) => {
    setMushafRevealedAyahs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleRevealedLine = (key: string) => {
    setRevealedLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // reset status terdedah bila tukar muka surat, supaya semua blur semula
  useEffect(() => {
    setMushafRevealedAyahs(new Set());
    setRevealedLines(new Set());
  }, [currentPage]);

  // muat layout.json, words.json & word-ayah-map.json SEKALI sahaja apabila Mode Mushaf dibuka buat pertama kali
  useEffect(() => {
    if (mushafMode && !mushafLayout) {
      setLoadingMushafData(true);
      Promise.all([
        fetch('/quran-data/layout.json').then(res => res.json()),
        fetch('/quran-data/words.json').then(res => res.json()),
        fetch('/quran-data/word-ayah-map.json').then(res => res.json()),
      ])
        .then(([layoutData, wordsData, ayahMapData]) => {
          setMushafLayout(layoutData);
          setMushafWords(wordsData);
          setWordAyahMap(ayahMapData);
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
    if (clamped === currentPage) return;
    setCurrentPage(clamped);
  };

  // baris untuk muka surat semasa sahaja (ditapis dari layout penuh)
  const currentPageLines = mushafLayout
    ? mushafLayout.filter((line: any) => line.p === currentPage).sort((a: any, b: any) => a.l - b.l)
    : [];

  // BAHARU: peta nombor surah -> muka surat permulaan (untuk dropdown "lompat ke surah")
  const surahStartPages = useMemo(() => {
    if (!mushafLayout) return {} as Record<number, number>;
    const map: Record<number, number> = {};
    for (const line of mushafLayout) {
      if (line.t === 'surah_name') map[line.s] = line.p;
    }
    return map;
  }, [mushafLayout]);

  // BAHARU: surah & juzuk yang sedang aktif di muka surat semasa (untuk footer)
  const currentSurahInfo = useMemo(() => {
    const entries = Object.entries(surahStartPages)
      .map(([id, page]) => ({ id: Number(id), page: page as number }))
      .sort((a, b) => a.page - b.page);

    let active = entries[0];
    for (const e of entries) {
      if (e.page <= currentPage) active = e;
      else break;
    }
    return active ? surahs.find((s: any) => s.id === active.id) : null;
  }, [surahStartPages, currentPage, surahs]);

  const currentJuzNumber = useMemo(() => {
    let active = JUZ_STARTS[0];
    for (const j of JUZ_STARTS) {
      if (j.p <= currentPage) active = j;
      else break;
    }
    return active ? active.j : 1;
  }, [currentPage]);
  // -------------------------------------------------------------------------

  // --- BAHARU: Mod Malam (Night Mode) --------------------------------------
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('darkMode') : null;
    if (saved === 'true') setDarkMode(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', String(darkMode));
    }
  }, [darkMode]);

  const theme = {
    bg: darkMode ? '#0f172a' : '#f8fafc',
    card: darkMode ? '#1e293b' : '#ffffff',
    border: darkMode ? '#334155' : '#e2e8f0',
    text: darkMode ? '#e5e7eb' : '#0f172a',
    textMuted: darkMode ? '#94a3b8' : '#64748b',
    accent: '#0f766e',
  };
  // -------------------------------------------------------------------------

  // --- BAHARU: status log masuk & progress hafazan -----------------------
  const [user, setUser] = useState<any>(null);
  const [masteredAyahs, setMasteredAyahs] = useState<Set<number>>(new Set());
  const [savingAyah, setSavingAyah] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

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

  const toggleMastered = async (surahId: number, ayahNumber: number) => {
    if (!user) return;
    setSavingAyah(ayahNumber);

    const alreadyMastered = masteredAyahs.has(ayahNumber);

    if (alreadyMastered) {
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

  // BAHARU: progress "master" MERENTASI SEMUA SURAH (untuk Mode Mushaf)
  const [allMasteredSet, setAllMasteredSet] = useState<Set<string>>(new Set());
  const [savingAyahKey, setSavingAyahKey] = useState<string | null>(null);

  const fetchAllMastered = async (userId: string) => {
    const { data, error } = await supabase
      .from('hafazan_progress')
      .select('surah_number, ayah_number')
      .eq('user_id', userId)
      .eq('status', 'master');

    if (error) {
      console.error(error);
      return;
    }
    setAllMasteredSet(new Set((data || []).map((r: any) => `${r.surah_number}:${r.ayah_number}`)));
  };

  useEffect(() => {
    if (mushafMode && user) {
      fetchAllMastered(user.id);
    }
  }, [mushafMode, user]);

  const toggleAyahMastered = async (surah: number, ayah: number, key: string) => {
    if (!user) return;
    setSavingAyahKey(key);

    const already = allMasteredSet.has(key);

    if (already) {
      await supabase
        .from('hafazan_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('surah_number', surah)
        .eq('ayah_number', ayah);
      setAllMasteredSet((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } else {
      await supabase
        .from('hafazan_progress')
        .upsert(
          {
            user_id: user.id,
            surah_number: surah,
            ayah_number: ayah,
            status: 'master',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,surah_number,ayah_number' }
        );
      setAllMasteredSet((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
    }

    setSavingAyahKey(null);
  };
  // -------------------------------------------------------------------------

  // --- BAHARU: kawalan Papar Terjemahan & Mode Hafazan -------------------
  const [showTranslation, setShowTranslation] = useState<boolean>(true);
  const [hafazanMode, setHafazanMode] = useState<boolean>(false);
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

  // --- BAHARU: pagination ayat untuk surah panjang (max 30 ayat/muka) -----
  const VERSES_PER_PAGE = 30;
  const [versePage, setVersePage] = useState(1);
  const totalVersePages = Math.ceil(verses.length / VERSES_PER_PAGE) || 1;
  const pagedVerses = verses.slice(
    (versePage - 1) * VERSES_PER_PAGE,
    versePage * VERSES_PER_PAGE
  );
  const versePageStartIndex = (versePage - 1) * VERSES_PER_PAGE;
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
    setRevealedAyahs(new Set());
    setMasteredAyahs(new Set());
    setVersePage(1);
    setLoadingVerses(true);

    if (user) {
      fetchMasteredAyahs(surah.id, user.id);
    }

    const fetchArabic = fetch(`https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number=${surah.id}`)
      .then(res => res.json());

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

  if (mushafMode) {
    return (
      <div className={darkMode ? 'dark-theme' : ''} style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: theme.bg, overflowY: 'auto', fontFamily: '"Inter", sans-serif', ['--mushaf-text-color' as any]: theme.text }}>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet" />
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

          .dark-theme tajweed[class="madda_necessary"] { color: #5C7CFA; }
          .dark-theme tajweed[class="madda_obligatory"],
          .dark-theme tajweed[class="madda_obligatory_mottasel"],
          .dark-theme tajweed[class="madda_obligatory_monfasel"] { color: #6C8EFF; }

          .mushaf-line {
            font-family: 'UthmanicHafs', serif;
            line-height: 2.3;
            color: var(--mushaf-text-color, #111827);
            transition: font-size 0.1s ease-out;
          }

          .mushaf-box {
            max-width: 480px;
            margin: 0 auto;
            padding: 10px 12px;
            overflow-x: hidden;
          }

          @media (max-width: 480px) {
            .mushaf-box { max-width: 100%; padding: 10px 18px !important; }
            .mushaf-outer { padding: 10px 10px 40px 10px !important; }
          }
        `}</style>

        <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: theme.card, borderBottom: `1px solid ${theme.border}`, padding: '10px 15px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '10px', maxWidth: '680px', margin: '0 auto' }}>
            <button
              onClick={() => setMushafMode(false)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.card,
                color: theme.textMuted,
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ⬅️ Keluar
            </button>

            <button
              onClick={() => setDarkMode((v) => !v)}
              style={{
                padding: '8px 12px',
                borderRadius: '20px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.card,
                color: theme.text,
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>

            <button
              onClick={() => setMushafHafazanMode((v) => !v)}
              style={{
                padding: '8px 14px',
                borderRadius: '20px',
                border: mushafHafazanMode ? '1px solid #b45309' : `1px solid ${theme.border}`,
                backgroundColor: mushafHafazanMode ? '#b45309' : theme.card,
                color: mushafHafazanMode ? '#ffffff' : theme.text,
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {mushafHafazanMode ? '✓ Mode Hafazan' : '🙈 Mode Hafazan'}
            </button>

            <select
              value=""
              onChange={(e) => {
                const page = surahStartPages[Number(e.target.value)];
                if (page) goToPage(page);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
                color: theme.accent,
                fontWeight: 600,
                fontSize: '13px',
                backgroundColor: theme.card,
                cursor: 'pointer',
              }}
            >
              <option value="" disabled>Lompat ke Surah...</option>
              {surahs.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.id}. {s.name_complex}
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                style={{
                  padding: '8px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`,
                  backgroundColor: theme.card, color: theme.accent, fontWeight: 600,
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
                  style={{ width: '60px', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${theme.border}`, textAlign: 'center', backgroundColor: theme.card, color: theme.text }}
                />
                <span style={{ fontSize: '13px', color: theme.textMuted }}>/ 604</span>
              </form>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= 604}
                style={{
                  padding: '8px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`,
                  backgroundColor: theme.card, color: theme.accent, fontWeight: 600,
                  cursor: currentPage >= 604 ? 'not-allowed' : 'pointer', opacity: currentPage >= 604 ? 0.4 : 1,
                }}
              >
                ▶
              </button>
            </div>
          </div>
        </div>

        <div className="mushaf-outer" style={{ maxWidth: '680px', margin: '0 auto', padding: '15px 15px 40px 15px' }}>
          {user && !mushafHafazanMode && (
            <p style={{ textAlign: 'center', color: theme.textMuted, fontSize: '11px', margin: '0 0 10px 0' }}>
              👆 Tekan mana-mana ayat untuk tanda/buang tanda hafaz
            </p>
          )}
          {loadingMushafData ? (
            <p style={{ textAlign: 'center', color: '#64748b', fontWeight: '500' }}>Sedang memuatkan data mushaf (sekali sahaja, lepas ni pantas)...</p>
          ) : (
            <div className="mushaf-box">
              {currentPageLines.map((line: any, idx: number) => {
                const juzHere = JUZ_STARTS.find((j) => j.p === line.p && j.l === line.l);

                const juzBadge = juzHere && (
                  <div
                    key={`juz-${idx}`}
                    style={{ textAlign: 'center', margin: '10px 0 4px 0', fontFamily: '"Inter", sans-serif' }}
                  >
                    <span style={{
                      display: 'inline-block',
                      padding: '3px 14px',
                      borderRadius: '20px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                    }}>
                      JUZUK {juzHere.j}
                    </span>
                  </div>
                );

                if (line.t === 'surah_name') {
                  const surahInfo = surahs.find((s: any) => s.id === line.s);
                  return (
                    <div key={idx}>
                      {juzBadge}
                      <div style={{ textAlign: 'center', margin: '16px 0' }}>
                        <div style={{
                          display: 'inline-flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '8px 26px',
                          border: '1px solid #0f766e',
                          borderRadius: '8px',
                        }}>
                          <div dir="rtl" style={{ fontFamily: "'UthmanicHafs', serif", fontSize: '23px', color: '#0f766e', fontWeight: 700 }}>
                            {surahInfo?.name_arabic || ''}
                          </div>
                          <div style={{ fontFamily: '"Inter", sans-serif', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                            {surahInfo?.name_complex || `Surah ${line.s}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (line.t === 'basmallah') {
                  const lineKey = `${line.p}-${line.l}`;
                  const isRevealed = revealedLines.has(lineKey);
                  return (
                    <div key={idx}>
                      {juzBadge}
                      <div style={{ margin: '10px 0' }}>
                        <MushafLine
                          words={BISMILLAH_WORDS}
                          centered={true}
                          blurred={mushafHafazanMode && !isRevealed}
                          onClick={mushafHafazanMode ? () => toggleRevealedLine(lineKey) : undefined}
                        />
                      </div>
                    </div>
                  );
                }

                const lineWords = mushafWords && line.f && line.e
                  ? mushafWords.slice(line.f - 1, line.e)
                  : [];
                const lineAyahCodes = wordAyahMap && line.f && line.e
                  ? Array.from({ length: line.e - line.f + 1 }, (_, i) => wordAyahMap[line.f - 1 + i] || 0)
                  : lineWords.map(() => 0);

                return (
                  <div key={idx}>
                    {juzBadge}
                    <MushafLine
                      words={lineWords}
                      ayahCodes={lineAyahCodes}
                      centered={!!line.c}
                      getWordState={(code) => {
                        const surah = Math.floor(code / 1000);
                        const ayah = code % 1000;
                        const key = `${surah}:${ayah}`;

                        if (mushafHafazanMode) {
                          const isRevealed = mushafRevealedAyahs.has(key);
                          return {
                            blurred: !isRevealed,
                            highlighted: allMasteredSet.has(key), // BAHARU: garis kekal nampak walaupun sedang blur
                            onClick: () => toggleRevealedAyah(key),
                          };
                        }

                        const isSaving = savingAyahKey === key;
                        return {
                          highlighted: allMasteredSet.has(key),
                          onClick: user && !isSaving ? () => toggleAyahMastered(surah, ayah, key) : undefined,
                        };
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '14px 0 4px 0' }}>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              style={{
                padding: '6px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
                backgroundColor: theme.card, color: theme.accent, fontWeight: 600, fontSize: '13px',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: currentPage <= 1 ? 0.4 : 1,
              }}
            >
              ◀ Kembali
            </button>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= 604}
              style={{
                padding: '6px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
                backgroundColor: theme.card, color: theme.accent, fontWeight: 600, fontSize: '13px',
                cursor: currentPage >= 604 ? 'not-allowed' : 'pointer', opacity: currentPage >= 604 ? 0.4 : 1,
              }}
            >
              Seterusnya ▶
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 4px', fontFamily: '"Inter", sans-serif' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {currentPage} - <span style={{ fontSize: '13px' }}>{toArabicNumeral(currentPage)}</span>
            </span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {currentSurahInfo?.name_complex || ''} • Juzuk {currentJuzNumber}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark-theme' : ''} style={{ maxWidth: '850px', margin: '0 auto', padding: '25px', fontFamily: '"Inter", sans-serif', backgroundColor: theme.bg, minHeight: '100vh', color: theme.text }}>

      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet" />

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

        .dark-theme tajweed[class="madda_necessary"] { color: #5C7CFA; }
        .dark-theme tajweed[class="madda_obligatory"],
        .dark-theme tajweed[class="madda_obligatory_mottasel"],
        .dark-theme tajweed[class="madda_obligatory_monfasel"] { color: #6C8EFF; }
      `}</style>



      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <button
          onClick={() => setDarkMode((v) => !v)}
          style={{
            padding: '6px 12px',
            borderRadius: '20px',
            border: `1px solid ${theme.border}`,
            backgroundColor: theme.card,
            color: theme.text,
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: theme.textMuted }}>
            <span>👤 {user.email}</span>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                border: `1px solid ${theme.border}`,
                backgroundColor: theme.card,
                color: theme.textMuted,
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
        🕋 30 Juzuk
      </h1>
      <p style={{ textAlign: 'center', color: theme.textMuted, fontSize: '14px', marginTop: 0 }}>
        {selectedSurah ? "⬅️ Klik logo untuk kembali ke senarai surah" : "Hafazan Al-Quran 30 Juzuk — Tajwid Berwarna & Terjemahan Malaysia"}
      </p>

      {!selectedSurah && !mushafMode && (
        <div style={{ textAlign: 'center', marginTop: '2px' }}>
          <a href="/about" style={{ fontSize: '12px', color: theme.textMuted, textDecoration: 'underline' }}>
            ℹ️ Tentang 30 Juzuk
          </a>
        </div>
      )}

      {!selectedSurah && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
          <button
            onClick={openMushafMode}
            style={{
              padding: '10px 20px',
              borderRadius: '20px',
              border: '1px solid #0f766e',
              backgroundColor: theme.card,
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

      <hr style={{ border: '0', borderTop: `1px solid ${theme.border}`, margin: '20px 0' }} />

      {selectedSurah ? (
        <div>
          <div style={{ backgroundColor: theme.card, padding: '25px', borderRadius: '12px', border: `1px solid ${theme.border}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '25px', textAlign: 'center' }}>
            <h2 dir="rtl" style={{ color: '#0f766e', margin: '0 0 8px 0', fontSize: '30px', fontFamily: "'UthmanicHafs', serif" }}>{selectedSurah.name_arabic}</h2>
            <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
              <span>{selectedSurah.name_complex}</span>
              <span style={{ margin: '0 10px' }}>•</span>
              <span>{selectedSurah.revelation_place === 'makkah' ? 'Makkiyah' : 'Madaniyah'}</span>
              <span style={{ margin: '0 10px' }}>•</span>
              <span>{selectedSurah.verses_count} Ayat</span>
            </div>

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
                  setRevealedAyahs(new Set());
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

              {totalVersePages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => setVersePage((p) => Math.max(1, p - 1))}
                    disabled={versePage <= 1}
                    style={{
                      padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
                      backgroundColor: theme.card, color: theme.accent, fontWeight: 600, fontSize: '13px',
                      cursor: versePage <= 1 ? 'not-allowed' : 'pointer', opacity: versePage <= 1 ? 0.4 : 1,
                    }}
                  >
                    ◀ Sebelum
                  </button>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                    Muka {versePage} / {totalVersePages}
                    <span style={{ color: '#94a3b8', fontWeight: 400 }}>
                      {' '}(Ayat {versePageStartIndex + 1}–{Math.min(versePageStartIndex + VERSES_PER_PAGE, verses.length)} dari {verses.length})
                    </span>
                  </span>
                  <button
                    onClick={() => setVersePage((p) => Math.min(totalVersePages, p + 1))}
                    disabled={versePage >= totalVersePages}
                    style={{
                      padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
                      backgroundColor: theme.card, color: theme.accent, fontWeight: 600, fontSize: '13px',
                      cursor: versePage >= totalVersePages ? 'not-allowed' : 'pointer', opacity: versePage >= totalVersePages ? 0.4 : 1,
                    }}
                  >
                    Seterusnya ▶
                  </button>
                </div>
              )}

              {selectedSurah.id !== 9 && selectedSurah.id !== 1 && versePage === 1 && (
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

              {pagedVerses.map((verse: any, localIndex: number) => {
                const index = versePageStartIndex + localIndex;
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
                      backgroundColor: theme.card,
                      padding: '30px',
                      borderRadius: '12px',
                      border: isMastered ? '1px solid #16a34a' : `1px solid ${theme.border}`,
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

                        {user && (
                          <button
                            onClick={() => toggleMastered(selectedSurah.id, Number(verseNumber))}
                            disabled={isSaving}
                            style={{
                              padding: '4px 12px',
                              borderRadius: '20px',
                              border: isMastered ? '1px solid #16a34a' : `1px solid ${theme.border}`,
                              backgroundColor: isMastered ? '#16a34a' : theme.card,
                              color: isMastered ? '#ffffff' : theme.textMuted,
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

                    <div
                      dir="rtl"
                      onClick={() => hafazanMode && toggleReveal(verse.id)}
                      style={{
                        fontSize: '32px',
                        fontFamily: "'UthmanicHafs', serif",
                        lineHeight: '2.5',
                        textAlign: 'right',
                        direction: 'rtl',
                        color: theme.text,
                        filter: isBlurred ? 'blur(8px)' : 'none',
                        cursor: hafazanMode ? 'pointer' : 'default',
                        userSelect: isBlurred ? 'none' : 'auto',
                        transition: 'filter 0.25s ease',
                      }}
                      dangerouslySetInnerHTML={{ __html: verse.text_uthmani_tajweed }}
                    />

                    {showTranslation && !hafazanMode && (
                      <div
                        style={{
                          fontSize: '15px',
                          color: theme.textMuted,
                          lineHeight: '1.6',
                          borderTop: `1px dashed ${theme.border}`,
                          paddingTop: '15px',
                          textAlign: 'left'
                        }}
                        dangerouslySetInnerHTML={{ __html: translationText }}
                      />
                    )}
                  </div>
                );
              })}

              {totalVersePages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', paddingTop: '10px' }}>
                  <button
                    onClick={() => { setVersePage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={versePage <= 1}
                    style={{
                      padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
                      backgroundColor: theme.card, color: theme.accent, fontWeight: 600, fontSize: '13px',
                      cursor: versePage <= 1 ? 'not-allowed' : 'pointer', opacity: versePage <= 1 ? 0.4 : 1,
                    }}
                  >
                    ◀ Sebelum
                  </button>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                    Muka {versePage} / {totalVersePages}
                  </span>
                  <button
                    onClick={() => { setVersePage((p) => Math.min(totalVersePages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={versePage >= totalVersePages}
                    style={{
                      padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
                      backgroundColor: theme.card, color: theme.accent, fontWeight: 600, fontSize: '13px',
                      cursor: versePage >= totalVersePages ? 'not-allowed' : 'pointer', opacity: versePage >= totalVersePages ? 0.4 : 1,
                    }}
                  >
                    Seterusnya ▶
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginTop: '10px' }}>
          {surahs.map((surah) => (
            <div
              key={surah.id}
              onClick={() => handleSurahClick(surah)}
              style={{
                backgroundColor: theme.card,
                padding: '20px',
                borderRadius: '12px',
                border: `1px solid ${theme.border}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', backgroundColor: theme.bg, borderRadius: '8px', fontSize: '14px', fontWeight: '600', color: theme.textMuted }}>
                {surah.id}
              </div>
              <div style={{ flex: 1 }}>
                <div dir="rtl" style={{ fontFamily: "'UthmanicHafs', serif", fontWeight: '700', color: theme.text, fontSize: '22px' }}>
                  {surah.name_arabic}
                </div>
                <div style={{ fontSize: '12px', color: theme.textMuted, marginTop: '3px' }}>
                  {surah.name_complex} • {surah.translated_name.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
