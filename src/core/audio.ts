import { GameAudioScene, MusicTrackId, RunState } from './types';

export interface AudioStateResolution {
  currentMusic: MusicTrackId;
  audioScene: GameAudioScene;
  audioState: GameAudioScene;
}

/**
 * Pure core logic to determine which music track and audio scene should be active.
 *
 * Rules:
 * 1. Intro: Welcome / start screen plays 'start-screen.mp3'.
 * 2. Class Select & Map: Map music ('map-area.mp3') begins on the character selection screen ('class_select') and continues into map navigation ('play_area' with activeHook.type === 'NONE').
 * 3. Battle: Encounter / combat ('play_area' with activeHook.type === 'COMBAT') plays 'battle-normal.mp3'.
 * 4. Exiting map navigation state (entering village or shrine) stops map music.
 * 5. Completing battle (victory / defeat / stage complete) stops battle music; returning to map navigation resumes map music.
 */
export function determineActiveAudio(state: RunState): AudioStateResolution {
  if (state.screen === 'welcome') {
    return {
      currentMusic: 'start-screen',
      audioScene: 'intro',
      audioState: 'intro',
    };
  }

  if (state.screen === 'class_select') {
    return {
      currentMusic: 'map-area',
      audioScene: 'map',
      audioState: 'map',
    };
  }

  if (state.screen === 'play_area') {
    if (state.activeHook.type === 'COMBAT') {
      return {
        currentMusic: 'battle-normal',
        audioScene: 'battle',
        audioState: 'battle',
      };
    }
    if (state.activeHook.type === 'NONE') {
      return {
        currentMusic: 'map-area',
        audioScene: 'map',
        audioState: 'map',
      };
    }
    // Exited map navigation state to village, shrine, stage complete, game over:
    return {
      currentMusic: null,
      audioScene: 'none',
      audioState: 'none',
    };
  }

  // class_select or other non-navigation views
  return {
    currentMusic: null,
    audioScene: 'none',
    audioState: 'none',
  };
}

/**
 * Synchronizes the state's `currentMusic`, `audioScene`, and `audioState` fields.
 * Returns the exact same reference if values are already synchronized.
 */
export function syncAudioState(state: RunState): RunState {
  const { currentMusic, audioScene, audioState } = determineActiveAudio(state);
  if (
    state.currentMusic === currentMusic &&
    state.audioScene === audioScene &&
    state.audioState === audioState
  ) {
    return state;
  }
  return {
    ...state,
    currentMusic,
    audioScene,
    audioState,
  };
}
