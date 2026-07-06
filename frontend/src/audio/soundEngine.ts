export type SoundName =
  | 'tap'
  | 'key'
  | 'toggle'
  | 'nav'
  | 'deal'
  | 'correct'
  | 'wrong'
  | 'win';

type Ctx = AudioContext;

interface ToneSpec {
  freq: number;
  /** Delay from trigger, seconds. */
  at: number;
  /** Duration, seconds. */
  dur: number;
  type?: OscillatorType;
  /** Peak gain 0–1 (relative to a per-sound base). */
  gain?: number;
}

/**
 * A tiny synthesizer for UI sound effects. No audio files — everything is
 * generated with the Web Audio API, so nothing needs to be downloaded or
 * cached and the PWA stays fully offline.
 */
class SoundEngine {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private volume = 0.6;
  private lastPlay = new Map<SoundName, number>();

  setEnabled(value: boolean) {
    this.enabled = value;
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.01);
    }
  }

  /** Wire this to the first user gesture to satisfy mobile autoplay policies. */
  installUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.ensureContext();
      void this.ctx?.resume();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
  }

  private ensureContext(): Ctx | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  play(name: SoundName) {
    if (!this.enabled) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    const now = performance.now();
    const last = this.lastPlay.get(name) ?? 0;
    // Debounce identical sounds so rapid taps don't stack into clipping.
    if (now - last < 45) return;
    this.lastPlay.set(name, now);

    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    if (ctx.state === 'suspended') void ctx.resume();

    switch (name) {
      case 'tap':
        this.tones([{ freq: 320, at: 0, dur: 0.05, type: 'square', gain: 0.5 }], 0.16);
        break;
      case 'key':
        this.tones([{ freq: 660, at: 0, dur: 0.03, type: 'triangle', gain: 0.5 }], 0.12);
        break;
      case 'toggle':
        this.tones(
          [
            { freq: 420, at: 0, dur: 0.04, type: 'square', gain: 0.5 },
            { freq: 640, at: 0.05, dur: 0.05, type: 'square', gain: 0.5 },
          ],
          0.18,
        );
        break;
      case 'nav':
        this.tones([{ freq: 540, at: 0, dur: 0.06, type: 'sine', gain: 0.6 }], 0.2);
        break;
      case 'deal':
        this.noise(0.16, 0.22, 1400);
        break;
      case 'correct':
        this.tones(
          [
            { freq: 660, at: 0, dur: 0.1, type: 'sine', gain: 0.7 },
            { freq: 988, at: 0.08, dur: 0.16, type: 'sine', gain: 0.7 },
          ],
          0.28,
        );
        break;
      case 'wrong':
        this.tones(
          [
            { freq: 180, at: 0, dur: 0.16, type: 'sawtooth', gain: 0.35 },
            { freq: 140, at: 0.05, dur: 0.18, type: 'sawtooth', gain: 0.3 },
          ],
          0.3,
        );
        break;
      case 'win':
        this.tones(
          [
            { freq: 523, at: 0, dur: 0.12, type: 'sine', gain: 0.7 },
            { freq: 659, at: 0.1, dur: 0.12, type: 'sine', gain: 0.7 },
            { freq: 784, at: 0.2, dur: 0.14, type: 'sine', gain: 0.7 },
            { freq: 1047, at: 0.3, dur: 0.28, type: 'sine', gain: 0.8 },
          ],
          0.5,
        );
        break;
    }
  }

  private tones(specs: ToneSpec[], peak: number) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t0 = ctx.currentTime + 0.001;
    for (const s of specs) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = s.type ?? 'sine';
      osc.frequency.value = s.freq;
      const start = t0 + s.at;
      const level = peak * (s.gain ?? 1);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), start + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, start + s.dur);
      osc.connect(g);
      g.connect(master);
      osc.start(start);
      osc.stop(start + s.dur + 0.02);
    }
  }

  private noise(dur: number, peak: number, cutoff: number) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      // Fade the noise so it reads as a soft "whoosh", not a burst.
      const env = 1 - i / frames;
      data[i] = (Math.random() * 2 - 1) * env * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = ctx.createGain();
    const t0 = ctx.currentTime + 0.001;
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }
}

export const soundEngine = new SoundEngine();
