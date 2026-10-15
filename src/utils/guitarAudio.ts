import { ChordFingering } from '../types';
import { getChordFingering, createDefaultFingering } from './chordDiagrams';

// Standard guitar tuning open string MIDI note numbers:
// String 6 (E2): 40
// String 5 (A2): 45
// String 4 (D3): 50
// String 3 (G3): 55
// String 2 (B3): 59
// String 1 (E4): 64
export const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64];

let sharedAudioContext: AudioContext | null = null;
const chordBufferCache = new Map<string, AudioBuffer>();

export function getAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioContext = new AudioContextClass();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

/**
 * Generates single plucked string samples using the Karplus-Strong physical modeling algorithm.
 * Models a realistic steel/nylon guitar string:
 * - Triangle/pluck impulse + smoothed excitation
 * - Proper circular delay buffer (no NaN glitching)
 * - Frequency-dependent damping (higher strings decay faster, lower strings resonate)
 */
function generateStringWaveform(
  sampleRate: number,
  midiNote: number,
  stringIdx: number,
  duration = 2.4
): Float32Array {
  const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
  const period = Math.max(2, Math.round(sampleRate / freq));
  const numSamples = Math.round(sampleRate * duration);
  const buf = new Float32Array(numSamples);

  // Pluck excitation: shaped pick attack + soft noise
  for (let i = 0; i < period; i++) {
    const x = i / period;
    // Triangle pluck displacement
    const pickShape = x < 0.25 ? x / 0.25 : (1 - x) / 0.75;
    const noise = Math.random() * 2 - 1;
    buf[i] = pickShape * 0.7 + noise * 0.3;
  }

  // 2-pass lowpass smoothing on excitation to soften the initial pick transient
  for (let p = 0; p < 2; p++) {
    for (let i = 1; i < period; i++) {
      buf[i] = (buf[i] + buf[i - 1]) * 0.5;
    }
  }

  // Karplus-Strong feedback loop
  // Thicker lower strings ring longer (~2.5s), thin higher strings decay slightly faster (~1.8s)
  const decay = 0.9955 - stringIdx * 0.0008;
  for (let i = period; i < numSamples; i++) {
    const p1 = buf[i - period];
    // Circular buffer index wrap: when i - period - 1 < 0, use the last sample of previous cycle
    const p2 = i - period - 1 >= 0 ? buf[i - period - 1] : buf[period - 1];
    buf[i] = (p1 + p2) * 0.5 * decay;
  }

  return buf;
}

/**
 * Plays an AudioBuffer with realistic acoustic guitar body resonance filters.
 */
function playBuffer(ctx: AudioContext, buffer: AudioBuffer, volume = 0.5) {
  try {
    const t = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // 1. Highpass filter to eliminate sub-audio DC thump
    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 75;

    // 2. Peaking filter for acoustic guitar body soundboard resonance (~200Hz)
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'peaking';
    bodyFilter.frequency.value = 210;
    bodyFilter.gain.value = 3.5;
    bodyFilter.Q.value = 1.2;

    // 3. Gentle lowpass to keep the tone warm and natural
    const lpFilter = ctx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.setValueAtTime(6500, t);
    lpFilter.frequency.exponentialRampToValueAtTime(1500, t + 1.2);

    // 4. Output gain
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, t);

    source.connect(hpFilter);
    hpFilter.connect(bodyFilter);
    bodyFilter.connect(lpFilter);
    lpFilter.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(t);
  } catch (err) {
    console.warn('Audio playBuffer error:', err);
  }
}

/**
 * Plays a single guitar string (where stringIndex is 0=6th string..5=1st string).
 * If fret is 'x', nothing is played.
 */
export function playGuitarString(
  stringIndex: number,
  fret: number | 'x',
  volume = 0.45
) {
  if (fret === 'x' || typeof fret !== 'number') return;
  try {
    const ctx = getAudioContext();
    const midiNote = OPEN_STRING_MIDI[stringIndex] + fret;
    const wave = generateStringWaveform(ctx.sampleRate, midiNote, stringIndex, 2.2);

    const buffer = ctx.createBuffer(1, wave.length, ctx.sampleRate);
    buffer.getChannelData(0).set(wave);

    playBuffer(ctx, buffer, volume);
  } catch (err) {
    console.warn('playGuitarString error:', err);
  }
}

/**
 * Plays a realistic acoustic guitar chord strum from frets array [6th, 5th, 4th, 3rd, 2nd, 1st].
 * Pre-mixes all 6 strings into a single composite AudioBuffer with authentic downstroke stagger.
 */
export function playChordFingering(
  frets: (number | 'x')[],
  strumSpeedMs = 28,
  volume = 0.42
) {
  try {
    const ctx = getAudioContext();
    const cacheKey = frets.join(',');

    // Check cache first for 0ms latency
    let buffer = chordBufferCache.get(cacheKey);
    if (!buffer) {
      const sampleRate = ctx.sampleRate;
      const totalDuration = 2.5;
      const totalSamples = Math.round(sampleRate * totalDuration);
      const mixed = new Float32Array(totalSamples);
      let offsetMs = 0;

      for (let s = 0; s < 6; s++) {
        const fret = frets[s];
        if (fret === 'x' || typeof fret !== 'number') continue;
        const midi = OPEN_STRING_MIDI[s] + fret;
        const stringWave = generateStringWaveform(sampleRate, midi, s, 2.3);

        const startSample = Math.round((offsetMs / 1000) * sampleRate);
        for (let j = 0; j < stringWave.length && startSample + j < totalSamples; j++) {
          mixed[startSample + j] += stringWave[j] * 0.28;
        }
        offsetMs += strumSpeedMs;
      }

      buffer = ctx.createBuffer(1, totalSamples, sampleRate);
      buffer.getChannelData(0).set(mixed);
      chordBufferCache.set(cacheKey, buffer);
    }

    playBuffer(ctx, buffer, volume);
  } catch (err) {
    console.warn('playChordFingering error:', err);
  }
}

/**
 * Plays a chord by its name (e.g. "C", "Am7", "FMaj7", "G/B"), using customChords if available,
 * falling back to the standard database or root triad.
 */
export function playChordByName(
  chordName: string,
  customChords?: Record<string, ChordFingering>,
  volume = 0.42
) {
  const fingering = getChordFingering(chordName, customChords) || createDefaultFingering(chordName);
  if (fingering && fingering.frets) {
    playChordFingering(fingering.frets, 28, volume);
  }
}
