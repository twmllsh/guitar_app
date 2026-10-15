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
 * Generates an authentic plucked string audio buffer using Karplus-Strong physical modeling.
 * Produces warm, natural acoustic guitar string vibrations.
 */
function createPluckedStringAudioBuffer(
  ctx: AudioContext,
  midiNote: number,
  stringIndex: number,
  duration = 2.2
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
  const period = Math.max(2, Math.round(sampleRate / freq));
  const numSamples = Math.round(sampleRate * duration);
  const buffer = ctx.createBuffer(1, numSamples, sampleRate);
  const data = buffer.getChannelData(0);

  // Initial noise burst simulating pick excitation
  for (let i = 0; i < period; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  // Lowpass smoothing on initial noise to simulate plectrum / fingertip contact
  for (let i = 1; i < period; i++) {
    data[i] = (data[i] + data[i - 1]) * 0.5;
  }

  // Karplus-Strong feedback loop with string-dependent loss factor
  // Thicker lower strings resonate longer, higher strings decay slightly faster
  const decay = 0.993 - stringIndex * 0.0012;
  for (let i = period; i < numSamples; i++) {
    data[i] = (data[i - period] + data[i - period - 1]) * 0.5 * decay;
  }

  return buffer;
}

/**
 * Plays a single guitar note at a given MIDI note number.
 */
export function playGuitarNote(
  midiNote: number,
  stringIndex = 2,
  startTime?: number,
  volume = 0.4
) {
  try {
    const ctx = getAudioContext();
    const t = startTime !== undefined ? startTime : ctx.currentTime;
    const buffer = createPluckedStringAudioBuffer(ctx, midiNote, stringIndex);

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Body resonance acoustic filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(5500, t);
    filter.frequency.exponentialRampToValueAtTime(1400, t + 1.2);

    // Warmth shelf
    const bassBooster = ctx.createBiquadFilter();
    bassBooster.type = 'peaking';
    bassBooster.frequency.value = 180;
    bassBooster.gain.value = 3;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);

    source.connect(filter);
    filter.connect(bassBooster);
    bassBooster.connect(gain);
    gain.connect(ctx.destination);

    source.start(t);
  } catch (err) {
    console.warn('Guitar audio playback error:', err);
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
  const midiNote = OPEN_STRING_MIDI[stringIndex] + fret;
  playGuitarNote(midiNote, stringIndex, undefined, volume);
}

/**
 * Plays a realistic acoustic guitar chord strum from frets array [6th, 5th, 4th, 3rd, 2nd, 1st].
 * Staggers the string plucks by strumSpeedMs (default 26ms) to create authentic downstroke strumming.
 */
export function playChordFingering(
  frets: (number | 'x')[],
  strumSpeedMs = 26,
  volume = 0.38
) {
  try {
    const ctx = getAudioContext();
    let currentT = ctx.currentTime + 0.005;
    const strumSec = strumSpeedMs / 1000;

    for (let s = 0; s < 6; s++) {
      const fret = frets[s];
      if (fret === 'x' || typeof fret !== 'number') continue;
      const midiNote = OPEN_STRING_MIDI[s] + fret;
      playGuitarNote(midiNote, s, currentT, volume);
      currentT += strumSec;
    }
  } catch (err) {
    console.warn('Chord strum playback error:', err);
  }
}

/**
 * Plays a chord by its name (e.g. "C", "Am7", "FMaj7", "G/B"), using customChords if available,
 * falling back to the standard database or root triad.
 */
export function playChordByName(
  chordName: string,
  customChords?: Record<string, ChordFingering>,
  volume = 0.38
) {
  const fingering = getChordFingering(chordName, customChords) || createDefaultFingering(chordName);
  if (fingering && fingering.frets) {
    playChordFingering(fingering.frets, 26, volume);
  }
}
