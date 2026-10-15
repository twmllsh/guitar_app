import { Song } from '../types';

/**
 * Updates browser title, meta description, Open Graph tags, and canonical URL
 * dynamically when the user selects or views a specific song sheet.
 */
export function updateSongSeo(song?: Song) {
  if (!song) {
    document.title = '기타 코드 악보 뷰어 & 에디터 | Guitar Chord Note';
    updateMeta('description', '가요 및 팝송 기타 코드 악보, ChordPro 뷰어 및 에디터, 실시간 조옮김(Transpose), 카포 운지법, 자동 스크롤 연주 지원');
    updateOgTag('og:title', '기타 코드 악보 뷰어 & 에디터 | Guitar Chord Note');
    updateOgTag('og:description', '실시간 조옮김, 카포 맞춤 운지법, 자동 스크롤을 지원하는 무료 기타 코드 악보 뷰어');
    updateOgTag('og:url', 'https://guitar.ponytail.kr/');
    updateCanonical('https://guitar.ponytail.kr/');
    return;
  }

  // Format dynamic title for high CTR on search engines
  const titleText = `${song.title} - ${song.artist} 기타 코드 악보 (조옮김, 카포 ${song.capo ? song.capo + '프렛' : '없음'}) | Guitar Chord`;
  document.title = titleText;

  // Extract clean lyric preview from content (remove ChordPro tags)
  const cleanSnippet = song.content
    .replace(/\{.*?\}/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/#.*/g, '')
    .trim()
    .slice(0, 140)
    .replace(/\s+/g, ' ');

  const descText = `${song.artist}의 '${song.title}' 기타 코드 및 가사 악보. 원곡 Key: ${song.originalKey || 'C'}${song.capo ? `, 카포: ${song.capo}프렛` : ''}. "${cleanSnippet}..." 실시간 조옮김 및 자동 스크롤 지원.`;

  updateMeta('description', descText);
  updateMeta('keywords', `${song.title} 기타코드, ${song.title} 악보, ${song.artist} 기타, 쉬운 기타코드, 기타 반주, 통기타악보`);

  const pageUrl = `https://guitar.ponytail.kr/song/${song.id}`;
  updateOgTag('og:title', `${song.title} - ${song.artist} 기타 코드 악보`);
  updateOgTag('og:description', descText);
  updateOgTag('og:url', pageUrl);
  updateCanonical(pageUrl);

  // Update MusicComposition structured data
  updateStructuredData(song, pageUrl);
}

function updateMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function updateOgTag(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function updateCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', url);
}

function updateStructuredData(song: Song, url: string) {
  const SCRIPT_ID = 'song-structured-data';
  let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicComposition',
    name: song.title,
    composer: {
      '@type': 'Person',
      name: song.artist,
    },
    musicalKey: song.originalKey || 'C',
    url: url,
    inLanguage: 'ko',
  };

  script.textContent = JSON.stringify(jsonLd);
}
