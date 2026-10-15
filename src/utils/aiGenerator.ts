// AI Song Sheet Generator utility using Google Gemini API

export interface GeneratedSong {
  title: string;
  artist: string;
  originalKey: string;
  capo: number;
  playKey: string;
  tempo?: number;
  strummingTip?: string;
  chordProContent: string;
}

export interface GenerateOptions {
  title: string;
  artist: string;
  difficulty?: 'easy' | 'original';
  additionalNotes?: string;
  apiKey?: string;
}

const LOCAL_STORAGE_KEY = 'guitar_app_gemini_api_key';

export function getActiveGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    const customKey = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (customKey && customKey.trim()) {
      return customKey.trim();
    }
  }

  const envKey = 
    (typeof __APP_ENV__ !== 'undefined' && __APP_ENV__.GEMINI_API_KEY) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.GEMINI_API_KEY) ||
    '';

  return String(envKey).trim().replace(/^['"]|['"]$/g, '');
}

export function saveCustomGeminiApiKey(key: string): void {
  try {
    if (!key.trim()) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEY, key.trim());
    }
  } catch (e) {
    console.warn('Failed to save Gemini API key to localStorage', e);
  }
}

export async function generateSongSheet(options: GenerateOptions): Promise<GeneratedSong> {
  const apiKey = (options.apiKey || getActiveGeminiApiKey()).trim();
  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. .env 파일에 등록하거나 설정에서 입력해 주세요.');
  }

  const isEasy = options.difficulty === 'easy';

  const systemInstruction = `당신은 20년 경력의 프로 기타리스트이자 음악 편곡가입니다.
사용자가 요청한 곡의 정확한 가사와 화성(기타 코드)을 파악하여 ChordPro 형식의 완성형 악보 데이터를 JSON 형태로 생성하세요.

[규칙]:
1. ChordPro 문법 준수:
   - 가사의 해당 음절 바로 앞에 대괄호로 코드를 삽입하세요 (예: [G]동해물과 [D]백두산이 [Em]마르고 닳도[C]록).
   - 인트로, 간주, 솔로, 아웃트로는 {comment: [Intro]}, {comment: [Chorus]} 등의 섹션 태그와 코드 나열로 표현하세요.
   - 곡 시작 부분에는 {title: 곡제목}, {artist: 가수}, {key: 키}, {capo: 카포}, {tempo: BPM} 메타데이터를 반드시 포함하세요.
2. 난이도 설정 (${isEasy ? '초보자 쉬운 코드 모드' : '원곡 충실 모드'}):
   ${
     isEasy
       ? '- 초보자가 연주하기 편하도록, F나 Bm 같은 하이코드가 많다면 Capo(카포)를 적극 활용하여 C, G, D, A, Em, Am 등 오픈 코드 위주의 운지로 편곡하세요. (예: 원곡 A키 -> Capo 2프렛 착용 후 G키 코드로 작성)'
       : '- 원곡의 실제 조표와 사운드에 가장 충실한 코드 진행(텐션 코드, 분수 코드 등 포함)으로 작성하세요.'
   }
3. 곡 구성:
   - 인트로, 1절, 후렴(Chorus), 2절, 브릿지, 마지막 후렴, 아웃트로까지 노래의 주요 전개를 생략 없이 알차게 작성하세요.
4. 출력 형식:
   반드시 마크다운이나 잡담 없이 순수 JSON 객체 하나만 출력하세요. JSON 스키마:
   {
     "title": "곡 제목",
     "artist": "가수/작곡가",
     "originalKey": "원곡 실제 키 (예: A, G, C, Eb 등)",
     "capo": 0 이상의 정수 프렛 번호 (없으면 0),
     "playKey": "실제 손으로 잡는 운지 키 (예: G)",
     "tempo": 정수 BPM (예: 92),
     "strummingTip": "추천 기타 주법 한 줄 팁 (예: 16비트 슬로우 고고, 3/4박자 왈츠 아르페지오 등)",
     "chordProContent": "ChordPro 전체 텍스트 본문"
   }`;

  const userPrompt = `노래 제목: ${options.title}
가수/아티스트: ${options.artist || '미상'}
${options.additionalNotes ? `추가 요청사항: ${options.additionalNotes}` : ''}`;

  // Try gemini-2.5-flash first, fallback to gemini-1.5-flash
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\n[사용자 요청]\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `HTTP ${response.status} 오류`;
        throw new Error(`[${model}] ${message}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('AI 응답 데이터가 비어 있습니다.');
      }

      // Parse JSON response
      const cleanJson = rawText.trim().replace(/^```json\s*|```$/g, '');
      const parsed: GeneratedSong = JSON.parse(cleanJson);

      if (!parsed.chordProContent) {
        throw new Error('생성된 악보 내용이 올바르지 않습니다.');
      }

      return parsed;
    } catch (err: any) {
      console.warn(`Gemini model ${model} failed, trying fallback...`, err);
      lastError = err;
    }
  }

  throw new Error(lastError?.message || 'AI 악보 생성 중 오류가 발생했습니다. API 키를 확인해 주세요.');
}
