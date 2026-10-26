/**
 * Audio sintetizado con la Web Audio API.
 *
 * No hay ficheros de sonido: todo se genera con osciladores y ruido filtrado.
 * Así el repositorio no necesita assets y el "clang" del parry puede variar
 * de tono según sea perfecto o no.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  enabled = true;

  /** Debe llamarse desde un gesto del usuario (clic / tecla). */
  init(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    try {
      const Ctor: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.45;
      this.master.connect(this.ctx.destination);
      void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  private get ready(): boolean {
    return this.enabled && this.ctx !== null && this.master !== null;
  }

  /* ------------------------------------------------------------------ */
  /*  Primitivas                                                         */
  /* ------------------------------------------------------------------ */

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    slideTo?: number,
    delay = 0,
  ): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + duration);
    }

    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(env).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.03);
  }

  private getNoise(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer) {
      const length = Math.floor(ctx.sampleRate * 1.5);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  private noise(
    duration: number,
    gain: number,
    filterType: BiquadFilterType,
    freqFrom: number,
    freqTo?: number,
    q = 1,
    delay = 0,
  ): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;

    const src = this.ctx.createBufferSource();
    src.buffer = this.getNoise(this.ctx);

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freqFrom, t);
    if (freqTo !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqTo), t + duration);
    }
    filter.Q.value = q;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    src.connect(filter).connect(env).connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.03);
  }

  /* ------------------------------------------------------------------ */
  /*  Efectos del juego                                                  */
  /* ------------------------------------------------------------------ */

  /** Choque metálico del parry. */
  clang(perfect = false): void {
    if (!this.ready) return;
    const base = perfect ? 1240 : 880;
    const partials = [1, 2.41, 3.73, 5.19, 7.03];
    partials.forEach((p, i) => {
      this.tone(base * p, 0.34 - i * 0.045, 'triangle', 0.16 / (i + 1), base * p * 0.94, i * 0.004);
    });
    this.noise(0.1, 0.2, 'highpass', 2600, 5200, 0.7);
    if (perfect) this.tone(1760, 0.22, 'sine', 0.1, 2640, 0.02);
  }

  /** Golpe recibido. */
  hit(): void {
    if (!this.ready) return;
    this.tone(150, 0.32, 'sine', 0.32, 52);
    this.tone(92, 0.4, 'triangle', 0.2, 40);
    this.noise(0.22, 0.26, 'lowpass', 1400, 260, 1.2);
  }

  /** Aire cortado por el arma del rival. */
  whoosh(): void {
    if (!this.ready) return;
    this.noise(0.26, 0.16, 'bandpass', 380, 1900, 1.4);
  }

  /** Intento fallido del jugador (fricción seca). */
  whiff(): void {
    if (!this.ready) return;
    this.noise(0.12, 0.08, 'bandpass', 1500, 700, 2.2);
    this.tone(320, 0.1, 'sine', 0.05, 180);
  }

  /** Aviso de que la ventana de parry está abierta. */
  tick(): void {
    if (!this.ready) return;
    this.tone(1580, 0.07, 'square', 0.045, 1980);
  }

  /** El rival cae. */
  defeat(): void {
    if (!this.ready) return;
    this.tone(420, 0.5, 'sawtooth', 0.12, 90);
    this.noise(0.5, 0.14, 'lowpass', 900, 120, 0.8);
  }

  /** Clic de interfaz. */
  ui(): void {
    if (!this.ready) return;
    this.tone(760, 0.08, 'sine', 0.07, 1040);
  }
}
