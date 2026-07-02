/**
 * All Budheads sound is synthesized with WebAudio — zero audio assets.
 * The AudioContext is created lazily on first user gesture (browser policy).
 */
export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted: boolean;

  constructor() {
    this.muted = localStorage.getItem("budheads.muted") === "1";
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem("budheads.muted", this.muted ? "1" : "0");
    return this.muted;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = "sine",
    volume = 1,
    slideTo?: number
  ) {
    if (this.muted || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration);
  }

  private noise(duration: number, volume = 0.5) {
    if (this.muted || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 800;
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
  }

  /** Catch pop — pitch climbs with the combo for that slot-machine feel. */
  catch(combo: number) {
    const step = Math.min(combo, 24);
    this.tone(320 + step * 28, 0.12, "triangle", 0.9);
    this.tone(640 + step * 56, 0.08, "sine", 0.35);
  }

  powerup() {
    this.tone(523, 0.1, "square", 0.5);
    setTimeout(() => this.tone(659, 0.1, "square", 0.5), 80);
    setTimeout(() => this.tone(784, 0.16, "square", 0.5), 160);
  }

  golden() {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.18, "triangle", 0.6), i * 70)
    );
  }

  hurt() {
    this.tone(180, 0.25, "sawtooth", 0.8, 60);
    this.noise(0.15, 0.4);
  }

  miss() {
    this.tone(240, 0.15, "sine", 0.4, 140);
  }

  levelUp() {
    [392, 494, 587, 784].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.14, "square", 0.45), i * 90)
    );
  }

  gameOver() {
    [392, 330, 262, 196].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.3, "sawtooth", 0.5), i * 180)
    );
  }

  highScore() {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
      setTimeout(() => this.tone(f, 0.16, "triangle", 0.6), i * 100)
    );
  }

  countdown(final: boolean) {
    this.tone(final ? 880 : 440, final ? 0.3 : 0.12, "square", 0.5);
  }

  click() {
    this.tone(660, 0.06, "sine", 0.4);
  }
}
