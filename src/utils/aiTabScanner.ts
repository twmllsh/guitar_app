import { getActiveGeminiApiKey } from './aiGenerator';

export interface ScanTabResult {
  title: string;
  artist: string;
  tempo: number;
  alphaTex: string;
  notes?: string;
}

// Default demonstration AlphaTex song (Romance de Amor - Spanish Romance)
export const DEFAULT_ALPHATEX_SAMPLE = `\\title "Romance de Amor (스페인 로망스)"
\\artist "Spanish Folk / Narciso Yepes"
\\tempo 105
\\ts 3 4
.
\\track "Acoustic Guitar" "acoustic_guitar_nylon"

// 마디 1
:8 7.1 0.2 0.3 7.1 0.2 0.3 7.1 0.2 0.3 |
// 마디 2
7.1 0.2 0.3 5.1 0.2 0.3 3.1 0.2 0.3 |
// 마디 3
3.1 0.2 0.3 2.1 0.2 0.3 0.1 0.2 0.3 |
// 마디 4
0.1 0.2 0.3 3.1 0.2 0.3 7.1 0.2 0.3 |
// 마디 5
12.1 0.2 0.3 12.1 0.2 0.3 12.1 0.2 0.3 |
// 마디 6
12.1 0.2 0.3 10.1 0.2 0.3 8.1 0.2 0.3 |
// 마디 7
8.1 0.2 0.3 7.1 0.2 0.3 5.1 0.2 0.3 |
// 마디 8
5.1 0.2 0.3 7.1 0.2 0.3 8.1 0.2 0.3 |
// 마디 9
7.1 0.2 0.3 8.1 0.2 0.3 7.1 0.2 0.3 |
// 마디 10
11.1 0.2 0.3 8.1 0.2 0.3 7.1 0.2 0.3 |
// 마디 11
7.1 0.2 0.3 5.1 0.2 0.3 3.1 0.2 0.3 |
// 마디 12
3.1 0.2 0.3 2.1 0.2 0.3 0.1 0.2 0.3 |
`;

/**
 * File (Image or PDF) to Base64 data URL extractor
 */
export async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const match = result.match(/^data:(.+?);base64,(.+)$/);
      if (match) {
        resolve({ mimeType: match[1], base64: match[2] });
      } else {
        reject(new Error('파일을 Base64로 변환하지 못했습니다.'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Scans TAB Sheet Music Image or PDF using Gemini Multimodal Vision API
 */
export async function scanTabFromMedia(
  file: File,
  options?: { customPrompt?: string; apiKey?: string }
): Promise<ScanTabResult> {
  const apiKey = (options?.apiKey || getActiveGeminiApiKey()).trim();
  if (!apiKey) {
    throw new Error('Gemini API 키가 필요합니다. 설정에서 API 키를 입력하거나 .env 파일에 등록해 주세요.');
  }

  const { base64, mimeType } = await fileToBase64(file);

  const systemPrompt = `당신은 세계 최고 수준의 기타 타브(TAB) 악보 분석 전문가입니다.
사용자가 첨부한 악보 이미지 또는 PDF 문서에서 기타 6현 타브(TAB) 악보를 정밀하게 분석하여 @coderline/alphatab 호환 'alphaTex' 형식으로 완벽하게 전사(Transcription)해 주세요.

[alphaTex 문법 규칙]:
1. 악보 메타데이터:
   \\title "노래 제목"
   \\artist "가수명"
   \\tempo 100
   \\ts 4 4 (박자표, 예: 4 4 또는 3 4 등)
   .
2. 음표 표기 방식:
   - 음표 길이: :1 (온음표), :2 (2분음표), :4 (4분음표), :8 (8분음표), :16 (16분음표)
   - 쉼표: r (예: :4 r)
   - 프렛 및 줄 번호: [프렛번호].[줄번호]
     * 1번줄(가장 얇은 줄, High E) = .1
     * 2번줄(B) = .2
     * 3번줄(G) = .3
     * 4번줄(D) = .4
     * 5번줄(A) = .5
     * 6번줄(가장 굵은 줄, Low E) = .6
     * 예: 5번줄 3프렛 = 3.5, 1번줄 0프렛 = 0.1, 6번줄 2프렛 = 2.6
   - 동시 타건 (화음): 괄호로 묶음 (예: (3.5 2.4 0.3 1.2))
   - 마디 구분: 반드시 세로줄 '|' 로 마디를 끝맺습니다.
   - 각 마디마다 박자 합(4/4박이면 4박자)을 정확히 맞춰주세요.

[반환 형식]:
반드시 오직 아래 JSON 형식으로만 응답하세요. 다른 설명이나 마크다운 래퍼 없이 JSON만 반환하세요:
{
  "title": "식별된 곡 제목 (없으면 '타브 악보 스캔본')",
  "artist": "아티스트 (없으면 '미상')",
  "tempo": 100,
  "alphaTex": "alphaTex 전체 텍스트 본문",
  "notes": "악보 분석 요약 (마디 수, 특징 등 한 줄 메모)"
}`;

  const userPrompt = `첨부된 타브 악보를 정확하게 읽어서 alphaTex 코드로 변환해 주세요.
${options?.customPrompt ? `추가 요청사항: ${options.customPrompt}` : ''}
프렛 번호와 박자를 가능한 한 누락 없이 충실하게 마디별로 옮겨 적어주세요.`;

  const modelsToTry = [
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.5-flash-lite'
  ];

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64
                  }
                },
                {
                  text: userPrompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`[${model}] HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error(`[${model}] 응답 텍스트가 비어있습니다.`);
      }

      const cleanJson = rawText.replace(/```(?:json)?\n?/gi, '').replace(/```\s*$/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        title: parsed.title || '스캔된 타브 악보',
        artist: parsed.artist || '알 수 없음',
        tempo: Number(parsed.tempo) || 100,
        alphaTex: parsed.alphaTex || '',
        notes: parsed.notes || 'Gemini Vision AI를 통해 생성되었습니다.'
      };
    } catch (err: any) {
      console.warn(`Gemini 모델 ${model} 실패:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('악보 이미지를 분석하지 못했습니다.');
}

/**
 * Generate TAB Riff / Intro from Song Title & Artist
 */
export async function generateTabFromTitle(options: {
  title: string;
  artist: string;
  part?: string; // 'intro', 'solo', 'riff', 'fingerstyle'
  apiKey?: string;
}): Promise<ScanTabResult> {
  const apiKey = (options.apiKey || getActiveGeminiApiKey()).trim();
  if (!apiKey) {
    throw new Error('Gemini API 키가 필요합니다.');
  }

  const partName = options.part || 'intro riff';

  const systemPrompt = `당신은 전설적인 기타리스트이자 타브 악보 편곡가입니다.
사용자가 요청한 노래의 ${partName} 부분을 @coderline/alphatab 전용 'alphaTex' 문법으로 정밀하게 작성하세요.

[alphaTex 문법 요약]:
\\title "노래 제목"
\\artist "가수명"
\\tempo BPM숫자
\\ts 4 4
.
- 박자: :4 (4분음표), :8 (8분음표), :16 (16분음표), :2 (2분음표), :1 (온음표)
- 음표: 프렛.줄번호 (1번줄은 High E, 6번줄은 Low E)
  예: 0.1 (1번줄 개방현), 3.5 (5번줄 3프렛), 2.4 (4번줄 2프렛)
- 화음: (3.5 2.4 0.3 1.2)
- 마디 끝: |

반드시 JSON 형식으로만 답하세요:
{
  "title": "노래 제목",
  "artist": "가수명",
  "tempo": 110,
  "alphaTex": "alphaTex 텍스트",
  "notes": "연주 팁 및 설명"
}`;

  const prompt = `노래 제목: ${options.title}
가수: ${options.artist}
요청 구간: ${partName}

실제 원곡의 시그니처 기타 인트로 리프나 메인 테마를 연주할 수 있도록 4~8마디 분량의 정확한 alphaTex 타브 악보를 작성해 주세요.`;

  const models = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite'];
  let lastErr: Error | null = null;

  for (const m of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(txt.replace(/```(?:json)?\n?/gi, '').replace(/```\s*$/g, '').trim());

      return {
        title: parsed.title || options.title,
        artist: parsed.artist || options.artist,
        tempo: Number(parsed.tempo) || 100,
        alphaTex: parsed.alphaTex || '',
        notes: parsed.notes || ''
      };
    } catch (e: any) {
      lastErr = e;
    }
  }

  throw lastErr || new Error('타브 악보를 생성하지 못했습니다.');
}
