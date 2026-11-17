// Original Web Audio API synthesizer for futuristic System sound effects (zero copyrighted audio)

class SystemSoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(freq: number, duration: number, type: OscillatorType = 'sine', delay = 0, gainVal = 0.08) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playTap() {
    this.tone(720, 0.06, 'sine', 0, 0.04);
  }

  playNotification() {
    this.tone(587.33, 0.12, 'triangle', 0, 0.06);
    this.tone(880, 0.18, 'sine', 0.08, 0.07);
  }

  playQuestComplete() {
    this.tone(523.25, 0.15, 'triangle', 0, 0.07);
    this.tone(659.25, 0.15, 'triangle', 0.1, 0.07);
    this.tone(783.99, 0.2, 'sine', 0.2, 0.08);
    this.tone(1046.5, 0.35, 'sine', 0.32, 0.09);
  }

  playLevelUp() {
    this.tone(440, 0.14, 'triangle', 0, 0.08);
    this.tone(554.37, 0.14, 'triangle', 0.1, 0.08);
    this.tone(659.25, 0.14, 'triangle', 0.2, 0.08);
    this.tone(880, 0.25, 'sine', 0.3, 0.09);
    this.tone(1174.66, 0.4, 'sine', 0.44, 0.1);
  }

  playRewardReveal() {
    this.tone(698.46, 0.14, 'sine', 0, 0.07);
    this.tone(1046.5, 0.28, 'triangle', 0.09, 0.08);
  }

  playWarning() {
    this.tone(220, 0.18, 'sawtooth', 0, 0.06);
    this.tone(196, 0.26, 'sawtooth', 0.2, 0.06);
  }
}

export const soundEngine = new SystemSoundEngine();
