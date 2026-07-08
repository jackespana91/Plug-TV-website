/**
 * Synthesized sound design — GDD §14. All cues are WebAudio-synthesized so
 * the prototype ships with zero binary assets. Audio is presentation-layer
 * only and carries no outcome information beyond the script being performed.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function ac(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setMuted(m: boolean): void {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}
export function isMuted(): boolean {
  return muted;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  gain = 0.2,
  slideTo?: number,
  when = 0,
): void {
  const c = ac();
  const t = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g).connect(master!);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, filterFreq: number, gain = 0.25, when = 0): void {
  const c = ac();
  const t = c.currentTime + when;
  const len = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter).connect(g).connect(master!);
  src.start(t);
}

/** Pentatonic "ladder motif" — rises with every consecutive delivery (GDD §14). */
const PENTA = [0, 2, 4, 7, 9];
export function deliveryNote(k: number): void {
  const step = PENTA[(k - 1) % 5] + 12 * Math.floor((k - 1) / 5);
  const freq = 330 * Math.pow(2, Math.min(step, 24) / 12);
  tone(freq, 0.28, 'triangle', 0.16);
}

export function thwack(): void {
  noise(0.07, 1800, 0.3);
  tone(140, 0.1, 'sine', 0.25, 60);
}

export function bark(): void {
  tone(300, 0.1, 'sawtooth', 0.12, 150);
  tone(280, 0.1, 'sawtooth', 0.12, 140, 0.13);
}

export function carHorn(): void {
  tone(370, 0.22, 'square', 0.07);
  tone(466, 0.22, 'square', 0.07);
}

export function bassHit(): void {
  tone(120, 0.35, 'sine', 0.45, 40);
  noise(0.12, 400, 0.18);
}

export function heartbeat(): void {
  tone(70, 0.12, 'sine', 0.3, 50);
  tone(60, 0.1, 'sine', 0.22, 45, 0.18);
}

export function envelopeChime(): void {
  tone(880, 0.15, 'sine', 0.14);
  tone(1320, 0.25, 'sine', 0.12, undefined, 0.09);
}

export function goldenShimmer(): void {
  [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.35, 'sine', 0.1, undefined, i * 0.07));
}

export function cashOutFanfare(big: boolean): void {
  noise(0.25, 900, 0.2); // skid
  const notes = big ? [523, 659, 784, 1047, 1319] : [523, 659, 784];
  notes.forEach((f, i) => tone(f, 0.3, 'triangle', 0.16, undefined, 0.12 + i * 0.09));
  if (big) [2093, 2637, 3136].forEach((f, i) => tone(f, 0.4, 'sine', 0.07, undefined, 0.6 + i * 0.12));
}

export function countTick(i: number): void {
  tone(900 + i * 60, 0.04, 'square', 0.05);
}

export function wipeout(): void {
  noise(0.3, 700, 0.3);
  tone(220, 0.5, 'sawtooth', 0.2, 55);
}

export function chainTick(): void {
  noise(0.015, 5000, 0.03);
}

export function decisionTick(): void {
  tone(4000, 0.02, 'sine', 0.05);
}
