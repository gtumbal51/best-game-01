// Synthesised sound effects: every sound is built from oscillators and
// filtered noise in the Web Audio API, so the game ships no audio files.
// The context is created lazily on the first user gesture (browsers block
// audio before interaction) and every effect is a short envelope.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuf = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.32;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) {
      return false;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.32;
    return this.muted;
  }

  // A single oscillator blip with a pitch glide and an exponential decay.
  blip(freqFrom, freqTo, dur, type, vol, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // A burst of filtered noise (impacts, pops, shatters).
  noise(dur, freq, vol, delay = 0, q = 1) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  shoot() {
    this.blip(880, 320, 0.09, 'square', 0.1);
  }
  hit() {
    this.noise(0.08, 900, 0.16);
  }
  pop(big) {
    this.blip(big ? 220 : 320, 60, big ? 0.35 : 0.22, 'sine', 0.28);
    this.noise(big ? 0.3 : 0.16, big ? 500 : 1400, 0.2);
  }
  shard() {
    this.blip(1320, 1760, 0.12, 'sine', 0.12);
    this.blip(1760, 2340, 0.14, 'sine', 0.08, 0.05);
  }
  nova() {
    this.blip(180, 1400, 0.55, 'sawtooth', 0.2);
    this.noise(0.6, 300, 0.3, 0, 0.6);
    this.blip(1400, 220, 0.5, 'sine', 0.18, 0.08);
  }
  horn() {
    this.blip(98, 98, 0.5, 'sawtooth', 0.16);
    this.blip(147, 147, 0.5, 'sawtooth', 0.12, 0.02);
    this.blip(196, 196, 0.45, 'triangle', 0.1, 0.04);
  }
  // A match chime that climbs a little higher with each cascade.
  matchChime(cascade) {
    const base = 523 * Math.pow(1.12, Math.min(6, cascade - 1));
    this.blip(base, base, 0.12, 'triangle', 0.16);
    this.blip(base * 1.25, base * 1.25, 0.12, 'triangle', 0.14, 0.07);
    this.blip(base * 1.5, base * 1.5, 0.18, 'triangle', 0.14, 0.14);
  }
  waveClear() {
    this.blip(523, 523, 0.14, 'triangle', 0.14);
    this.blip(659, 659, 0.14, 'triangle', 0.14, 0.12);
    this.blip(784, 784, 0.22, 'triangle', 0.16, 0.24);
  }
  hurt() {
    this.blip(160, 70, 0.3, 'sawtooth', 0.22);
    this.noise(0.2, 300, 0.2);
  }
  click() {
    this.blip(660, 520, 0.06, 'sine', 0.12);
  }
  victory() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((n, i) => this.blip(n, n, 0.35, 'triangle', 0.16, i * 0.13));
  }
  defeat() {
    const notes = [392, 330, 262, 196];
    notes.forEach((n, i) => this.blip(n, n * 0.92, 0.4, 'sawtooth', 0.12, i * 0.18));
  }
}
