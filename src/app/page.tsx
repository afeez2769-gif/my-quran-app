"use client";
import { useEffect, useState } from 'react';

export default function Home() {
  const [surahs, setSurahs] = useState([]);

  useEffect(() => {
    fetch('https://api.quran.com/api/v4/chapters?language=ms')
      .then(res => res.json())
      .then(data => setSurahs(data.chapters));
  }, []);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#059669', textAlign: 'center' }}>My Quran App</h1>
      <hr />
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {surahs.map((surah: data) => (
          <li key={surah.id} style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'between' }}>
            <div>
              <strong>{surah.id}. {surah.name_complex}</strong> <br />
              <small style={{ color: '#666' }}>({surah.translated_name.name})</small>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
// test update
