import { Song } from '../types';

export const DEFAULT_SONGS: Song[] = [
  {
    id: 'song-soyeon-quit',
    title: '퇴사할게여 (Narr. 기안84)',
    artist: '소연 (SOYEON)',
    originalKey: 'A',
    capo: 2,
    tempo: 122,
    updatedAt: Date.now(),
    content: `{title: 퇴사할게여 (Narr. 기안84)}
{artist: 소연 (SOYEON)}
{key: A}
{capo: 2}
{tempo: 122}

# [팁: Capo 2프렛 착용 시 G-D-Em-C 쉬운 코드로 연주 가능 / Transpose -2 추천]

{comment: [Intro]}
[A]  [E]  [F#m]  [D]
[A]  [E]  [F#m]  [D]

{comment: [Verse 1]}
[A]퇴사할게요 아쉬[E]울 거도 없거든요
[F#m]원래 이렇게 열심히 [D]살 생각 없었거든요
[A]오래 했어요 수[E]백 번을 참았거든요
[F#m]쿨하게 짐을 싸고 [D]뒤돌아보지 않고 모두 [E]안녕히 계세요

{comment: [Chorus]}
[A]그래 이팔청춘 [E]후회하면 어때요
[F#m]당장 저 문밖으[D]로 떠나요
[A]날씨 좋군요 [E]바람 좋군요
[F#m]결국 우린 모두 [D]할머니가 될 거고
[A]뒤돌아보면 [E]오늘 하루는
It was a romantic [F#m]day Romantic [D]
[A]La la la [E]la la la [F#m]la la [D]la

{comment: [Verse 2]}
[A]밥 먹을까요 요즘 [E]시간 좀 많거든요
[F#m]이제 전처럼 절대로 [D]약속 취소할 일은 없죠
(너 너 이거 또 거짓말하네 음)
[A]여행 갈까요 버[E]킷리스트가 있거든요
[F#m]전 세계 일주하기 [D]소설책 작가 되기
맘 편[E]히 노래 부르기

{comment: [Chorus]}
[A]그래 이팔청춘 [E]후회하면 어때요
[F#m]당장 저 문밖으[D]로 떠나요
[A]날씨 좋군요 [E]바람 좋군요
[F#m]결국 우린 모두 [D]할머니가 될 거고
[A]뒤돌아보면 [E]오늘 하루는
It was a romantic [F#m]day Romantic [D]
[A]La la la [E]la la la [F#m]la la [D]la

{comment: [Bridge]}
[D]내 이런 철없는 말이 [E]조금 당황스러워도
[C#m]오늘은 날 잡[F#m]지는 말아요
[Bm7]언젠가 후회하는 [C#m]날이 와도
[D]낭만이라 할 [E]테죠

{comment: [Outro]}
[A]나는 낭만적인 [E]할머니가 되어서
[F#m]뒤돌아보곤 [D]오늘 하루를
It was a romantic [A]day [E] Romantic [F#m] [D]
[A]La la la [E]la la la [F#m]la la [D]la [A]`
  },
  {
    id: 'song-1',
    title: '너에게 난 나에게 넌',
    artist: '자전거 탄 풍경',
    originalKey: 'G',
    capo: 0,
    tempo: 84,
    updatedAt: Date.now(),
    content: `{title: 너에게 난 나에게 넌}
{artist: 자전거 탄 풍경}
{key: G}
{tempo: 84}

{comment: [Intro]}
[G]  [D/F#]  [Em7]  [G/B]  [C]  [G/B]  [Am7]  [D7]

{comment: [Verse 1]}
[G]너에게 난 해질녘 [D/F#]노을처럼
[Em7]한편의 아름다운 [G/B]추억이 되고
[C]소중했던 우리 푸[G/B]르던 날을 기억하며
[Am7]후회없이 그림처럼 [D7]남아주기를

{comment: [Verse 2]}
[G]나에게 넌 내 외롭던 [D/F#]지난 시간을
[Em7]환하게 비춰주던 [G/B]햇살이 되고
[C]조그맣던 너의 하[G/B]얀 손 위에 빛나는
[Am7]보석처럼 영원의 [D7]약속이 되어

{comment: [Chorus]}
[G]너에게 난 해질녘 [D/F#]노을처럼
[Em7]한편의 아름다운 [G/B]추억이 되고
[C]소중했던 우리 푸[G/B]르던 날을 기억하며
[Am7]후회없이 [D7]그림처럼 남아[G]주기를`
  },
  {
    id: 'song-2',
    title: 'Let It Be',
    artist: 'The Beatles',
    originalKey: 'C',
    capo: 0,
    tempo: 72,
    updatedAt: Date.now() - 1000,
    content: `{title: Let It Be}
{artist: The Beatles}
{key: C}
{tempo: 72}

{comment: [Verse 1]}
When I [C]find myself in [G]times of trouble, [Am]Mother Mary [F]comes to me
[C]Speaking words of [G]wisdom, let it [F]be [C]
And in my [C]hour of darkness she is [G]standing right in [Am]front of me [F]
[C]Speaking words of [G]wisdom, let it [F]be [C]

{comment: [Chorus]}
Let it [Am]be, let it [G]be, let it [F]be, let it [C]be
[C]Whisper words of [G]wisdom, let it [F]be [C]

{comment: [Verse 2]}
And when the [C]broken hearted [G]people living [Am]in the world a[F]gree
[C]There will be an [G]answer, let it [F]be [C]
For though they [C]may be parted, there is [G]still a chance that [Am]they will see [F]
[C]There will be an [G]answer, let it [F]be [C]`
  },
  {
    id: 'song-3',
    title: '먼지가 되어',
    artist: '김광석',
    originalKey: 'Am',
    capo: 0,
    tempo: 96,
    updatedAt: Date.now() - 2000,
    content: `{title: 먼지가 되어}
{artist: 김광석}
{key: Am}
{tempo: 96}

{comment: [Intro]}
[Am]  [Am/G]  [D/F#]  [F]  [E7]

{comment: [Verse 1]}
[Am]바하의 선율에 젖은 [Am/G]날에는
[D/F#]잊었던 기억들이 [F]피어나[E7]고
[Am]비라도 내리는 [Am/G]밤이면
[D/F#]쓸쓸한 마음 가눌 [F]길이 [E7]없네

{comment: [Chorus]}
[C]작은 가슴을 [G]태우며
[Am]날아가는 [Em]어린 새처럼
[F]날아올라 [C]먼지가 되어
[Dm7]날아가고 [E7]싶어라`
  }
];
