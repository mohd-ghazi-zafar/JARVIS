// Web Audio API deterministic sound synthesizer for tactile feedback

class AudioEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // Lazily initialized on first interaction
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Ultra-short tactile mechanical dial click
  public playDialClick(frequency = 1200) {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.012);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.012);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.015);
    } catch {
      // AudioContext policy fallback
    }
  }

  // Lock engagement chime
  public playLockChime(locked: boolean) {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      if (locked) {
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(780, now + 0.08);
      } else {
        osc.frequency.setValueAtTime(780, now);
        osc.frequency.setValueAtTime(520, now + 0.08);
      }

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Ignore
    }
  }

  // Focus completion harmonic chime
  public playFocusBell() {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      [880, 1320, 1760].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.06, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8 + idx * 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + 0.9 + idx * 0.08);
      });
    } catch {
      // Ignore
    }
  }
}

export const sound = new AudioEngine();
