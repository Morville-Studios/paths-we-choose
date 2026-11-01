import { MusicTrackId, RunState } from '../core/types';

export interface AudioManagerOptions {
  volume?: number;
  muted?: boolean;
}

export class AudioManager {
  private tracks: Map<string, HTMLAudioElement> = new Map();
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
      'start-screen': '/audio/start-screen.mp3',
      'map-area': '/audio/map-area.mp3',
      'battle-normal': '/audio/battle-normal.mp3',
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
      audio.volume = this.volume;
    }
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

    // Stop and rewind previous track
    if (this.currentTrackId) {
      const prevAudio = this.tracks.get(this.currentTrackId);
      if (prevAudio) {
        prevAudio.pause();
        try {
          prevAudio.currentTime = 0;
        } catch {
          // ignore if currentTime reset fails before metadata loaded
        }
      }
    }

    this.currentTrackId = nextTrack;

    // No music desired in this state (e.g. class select, village, shrine, game over)
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

    try {
      nextAudio.currentTime = 0;
    } catch {
      // ignore
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
    if (this.currentTrackId) {
      const audio = this.tracks.get(this.currentTrackId);
      if (audio) {
        audio.pause();
        try {
          audio.currentTime = 0;
        } catch {}
      }
      this.currentTrackId = null;
    }
  }
}

export const audioManager = new AudioManager();
