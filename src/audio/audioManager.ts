import { MusicTrackId, RunState } from '../core/types';
import { publicAsset } from '../ui/publicAsset';

export interface AudioManagerOptions {
  volume?: number;
  muted?: boolean;
}

export class AudioManager {
  private tracks: Map<string, HTMLAudioElement> = new Map();
  private activeFades: Map<HTMLAudioElement, any> = new Map();
  private currentTrackId: MusicTrackId = null;
  private volume: number = 0.5;
  private muted: boolean = false;
  private unlockListenerAttached: boolean = false;

  constructor(options?: AudioManagerOptions) {
    if (options?.volume !== undefined) this.volume = options.volume;
    if (options?.muted !== undefined) this.muted = options.muted;
    this.initTracks();
  }

  private initTracks(): void {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      return;
    }

    const trackUrls: Record<string, string> = {
      'start-screen': publicAsset('audio/start-screen.mp3'),
      'map-area': publicAsset('audio/map-area.mp3'),
      'battle-normal': publicAsset('audio/battle-normal.mp3'),
      'victory': publicAsset('audio/victory.mp3'),
      'shrine': publicAsset('audio/shrine.mp3'),
      'village': publicAsset('audio/village.mp3'),
    };

    for (const [id, url] of Object.entries(trackUrls)) {
      try {
        const audio = new Audio(url);
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = this.volume;
        this.tracks.set(id, audio);
      } catch (e) {
        console.warn(`[AudioManager] Could not initialize audio for ${id}:`, e);
      }
    }
  }

  private attachUnlockListeners(): void {
    if (this.unlockListenerAttached || typeof window === 'undefined') return;
    this.unlockListenerAttached = true;

    const unlock = () => {
      if (this.currentTrackId && !this.muted) {
        const audio = this.tracks.get(this.currentTrackId);
        if (audio && audio.paused) {
          audio.play().catch((err) => {
            console.warn('[AudioManager] User unlock play attempt failed:', err);
          });
        }
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
      this.unlockListenerAttached = false;
    };

    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('click', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
  }

  public getCurrentTrack(): MusicTrackId {
    return this.currentTrackId;
  }

  public isTrackMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.muted) {
      for (const [audio, timer] of this.activeFades.entries()) {
        clearInterval(timer);
        audio.pause();
        audio.volume = this.volume;
      }
      this.activeFades.clear();
      if (this.currentTrackId) {
        const audio = this.tracks.get(this.currentTrackId);
        if (audio) audio.pause();
      }
    } else {
      if (this.currentTrackId) {
        const audio = this.tracks.get(this.currentTrackId);
        if (audio) {
          audio.play().catch(() => this.attachUnlockListeners());
        }
      }
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    for (const audio of this.tracks.values()) {
      if (!this.activeFades.has(audio)) {
        audio.volume = this.volume;
      }
    }
  }

  private cancelFade(audio: HTMLAudioElement): void {
    const timer = this.activeFades.get(audio);
    if (timer !== undefined) {
      clearInterval(timer);
      this.activeFades.delete(audio);
    }
  }

  public fadeOutAndStop(audio: HTMLAudioElement, durationMs: number = 800): void {
    this.cancelFade(audio);
    if (typeof window === 'undefined') {
      audio.pause();
      try { audio.currentTime = 0; } catch {}
      return;
    }
    const startVolume = audio.volume;
    if (startVolume <= 0 || audio.paused) {
      audio.pause();
      try { audio.currentTime = 0; } catch {}
      audio.volume = this.volume;
      return;
    }

    const stepMs = 30;
    const totalSteps = Math.max(1, Math.floor(durationMs / stepMs));
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const ratio = Math.max(0, 1 - step / totalSteps);
      try {
        audio.volume = startVolume * ratio;
      } catch {}

      if (step >= totalSteps || audio.paused) {
        clearInterval(timer);
        this.activeFades.delete(audio);
        audio.pause();
        try {
          audio.currentTime = 0;
        } catch {}
        audio.volume = this.volume;
      }
    }, stepMs);

    this.activeFades.set(audio, timer);
  }

  public fadeIn(audio: HTMLAudioElement, durationMs: number = 800): void {
    this.cancelFade(audio);
    if (typeof window === 'undefined') {
      audio.volume = this.volume;
      return;
    }
    const targetVolume = this.volume;
    if (targetVolume <= 0) {
      audio.volume = 0;
      return;
    }

    audio.volume = 0;
    const stepMs = 30;
    const totalSteps = Math.max(1, Math.floor(durationMs / stepMs));
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const ratio = Math.min(1, step / totalSteps);
      try {
        audio.volume = targetVolume * ratio;
      } catch {}

      if (step >= totalSteps || audio.paused) {
        clearInterval(timer);
        this.activeFades.delete(audio);
        audio.volume = targetVolume;
      }
    }, stepMs);

    this.activeFades.set(audio, timer);
  }

  public sync(state: RunState): void {
    const nextTrack = state.currentMusic;

    // Track is already active and playing
    if (nextTrack === this.currentTrackId) {
      // If we have an active track and it's paused while unmuted (e.g. initial autoplay blocked), try resuming
      if (nextTrack && !this.muted) {
        const audio = this.tracks.get(nextTrack);
        if (audio && audio.paused) {
          audio.play().catch(() => this.attachUnlockListeners());
        }
      }
      return;
    }

    const prevTrackId = this.currentTrackId;

    // Stop previous track (fade out if it was victory or shrine)
    if (prevTrackId) {
      const prevAudio = this.tracks.get(prevTrackId);
      if (prevAudio) {
        if (prevTrackId === 'victory' || prevTrackId === 'shrine') {
          this.fadeOutAndStop(prevAudio, 800);
        } else {
          this.cancelFade(prevAudio);
          prevAudio.pause();
          try {
            prevAudio.currentTime = 0;
          } catch {
            // ignore if currentTime reset fails before metadata loaded
          }
        }
      }
    }

    this.currentTrackId = nextTrack;

    // No music desired in this state (e.g. class select, village, game over)
    if (!nextTrack) {
      return;
    }

    if (this.muted) {
      return;
    }

    const nextAudio = this.tracks.get(nextTrack);
    if (!nextAudio) {
      return;
    }

    this.cancelFade(nextAudio);

    try {
      nextAudio.currentTime = 0;
    } catch {
      // ignore
    }

    if (
      (prevTrackId === 'victory' || prevTrackId === 'shrine') &&
      nextTrack === 'map-area'
    ) {
      this.fadeIn(nextAudio, 800);
    } else if (nextTrack === 'shrine') {
      this.fadeIn(nextAudio, 800);
    } else {
      nextAudio.volume = this.volume;
    }

    const playPromise = nextAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy blocked audio before user gesture; listen for first user action
        this.attachUnlockListeners();
      });
    }
  }

  public stopAll(): void {
    for (const [audio, timer] of this.activeFades.entries()) {
      clearInterval(timer);
      audio.pause();
      try { audio.currentTime = 0; } catch {}
      audio.volume = this.volume;
    }
    this.activeFades.clear();

    if (this.currentTrackId) {
      const audio = this.tracks.get(this.currentTrackId);
      if (audio) {
        audio.pause();
        try {
          audio.currentTime = 0;
        } catch {}
        audio.volume = this.volume;
      }
      this.currentTrackId = null;
    }
  }

  private sfxContext: AudioContext | null = null;

  public playSlashSound(): void {
    if (this.muted || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.sfxContext) {
        this.sfxContext = new AudioCtx();
      }
      if (this.sfxContext.state === 'suspended') {
        this.sfxContext.resume().catch(() => {});
      }
      const ctx = this.sfxContext;
      const now = ctx.currentTime;

      // 1. Blade whoosh / white noise burst through bandpass filter
      const bufferSize = Math.floor(ctx.sampleRate * 0.18);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(600, now + 0.15);
      filter.Q.setValueAtTime(2.5, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(this.volume * 0.9, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);

      // 2. Metallic slice / blade impact tone
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

      oscGain.gain.setValueAtTime(this.volume * 0.45, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);

      // 3. Low impact thud
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(150, now);
      thud.frequency.exponentialRampToValueAtTime(45, now + 0.1);

      thudGain.gain.setValueAtTime(this.volume * 0.6, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      thud.connect(thudGain);
      thudGain.connect(ctx.destination);
      thud.start(now);
      thud.stop(now + 0.12);
    } catch (e) {
      console.warn('[AudioManager] playSlashSound failed:', e);
    }
  }

  public playShieldSound(): void {
    if (this.muted || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.sfxContext) {
        this.sfxContext = new AudioCtx();
      }
      if (this.sfxContext.state === 'suspended') {
        this.sfxContext.resume().catch(() => {});
      }
      const ctx = this.sfxContext;
      const now = ctx.currentTime;

      // Resonant metallic deflection / shield shimmer tone
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);

      oscGain.gain.setValueAtTime(0.001, now);
      oscGain.gain.linearRampToValueAtTime(this.volume * 0.45, now + 0.03);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);

      // Soft metallic chime harmonic
      const chime = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(1046.5, now + 0.02);
      chime.frequency.exponentialRampToValueAtTime(1318.5, now + 0.12);

      chimeGain.gain.setValueAtTime(0.001, now);
      chimeGain.gain.linearRampToValueAtTime(this.volume * 0.25, now + 0.04);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      chime.connect(chimeGain);
      chimeGain.connect(ctx.destination);
      chime.start(now + 0.02);
      chime.stop(now + 0.32);
    } catch (e) {
      console.warn('[AudioManager] playShieldSound failed:', e);
    }
  }
}

export const audioManager = new AudioManager();
