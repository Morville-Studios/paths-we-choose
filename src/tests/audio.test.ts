import { describe, expect, it } from 'vitest';
import { determineActiveAudio, syncAudioState } from '../core/audio';
import {
  chooseCard,
  confirmCombatVictory,
  createInitialState,
  dismissWelcomePrepare,
  finishVillage,
  goToClassSelect,
  leaveShrine,
  playCard,
  startAdventure,
  villageDoRest,
} from '../core/engine';
import { endPlayerCombatTurn } from '../core/combat';
import { AudioManager } from '../audio/audioManager';
import { RunState } from '../core/types';

describe('Audio Scene & Music State Tracking', () => {
  it('initial state starts on welcome screen with start-screen music and intro scene', () => {
    const s = createInitialState('audio-test-seed');
    expect(s.screen).toBe('welcome');
    expect(s.currentMusic).toBe('start-screen');
    expect(s.audioScene).toBe('intro');
    expect(s.audioState).toBe('intro');
  });

  it('moving to class select starts map-area music in map scene', () => {
    const s = createInitialState('audio-test-seed');
    const next = goToClassSelect(s);
    expect(next.screen).toBe('class_select');
    expect(next.currentMusic).toBe('map-area');
    expect(next.audioScene).toBe('map');
    expect(next.audioState).toBe('map');
  });

  it('starting adventure starts map-area music in map navigation scene', () => {
    const s = startAdventure('fighter', 'audio-test-seed');
    expect(s.screen).toBe('play_area');
    expect(s.activeHook.type).toBe('NONE');
    expect(s.currentMusic).toBe('map-area');
    expect(s.audioScene).toBe('map');
    expect(s.audioState).toBe('map');
  });

  it('dismissing turn 0 welcome preparation stays in map scene with map-area music', () => {
    const s = startAdventure('fighter', 'audio-test-seed');
    const dismissed = dismissWelcomePrepare(s);
    expect(dismissed.currentMusic).toBe('map-area');
    expect(dismissed.audioScene).toBe('map');
  });

  it('pure determineActiveAudio correctly maps every hook and screen', () => {
    const base = createInitialState('audio-pure-test');

    // Welcome
    expect(determineActiveAudio(base)).toEqual({
      currentMusic: 'start-screen',
      audioScene: 'intro',
      audioState: 'intro',
    });

    // Class select
    expect(determineActiveAudio({ ...base, screen: 'class_select' })).toEqual({
      currentMusic: 'map-area',
      audioScene: 'map',
      audioState: 'map',
    });

    // Play area - Map navigation
    const playAreaMap: RunState = {
      ...base,
      screen: 'play_area',
      activeHook: { type: 'NONE' },
    };
    expect(determineActiveAudio(playAreaMap)).toEqual({
      currentMusic: 'map-area',
      audioScene: 'map',
      audioState: 'map',
    });

    // Play area - Encounter combat
    const playAreaCombat: RunState = {
      ...base,
      screen: 'play_area',
      activeHook: {
        type: 'COMBAT',
        combat: {
          monsters: [],
          combatTurn: 1,
          playerAp: 3,
          playerMaxAp: 3,
          playerBlock: 0,
          playerEvasionMod: 0,
          drawPile: [],
          hand: [],
          discardPile: [],
          combatLog: [],
        },
      },
    };
    expect(determineActiveAudio(playAreaCombat)).toEqual({
      currentMusic: 'battle-normal',
      audioScene: 'battle',
      audioState: 'battle',
    });

    // Play area - Village
    const playAreaVillage: RunState = {
      ...base,
      screen: 'play_area',
      activeHook: {
        type: 'VILLAGE',
        village: {
          coord: { col: 0, row: 1 },
          turn: 1,
          subView: 'main',
          trainOptions: [],
          shopStock: [],
          actionTaken: false,
        },
      },
    };
    expect(determineActiveAudio(playAreaVillage)).toEqual({
      currentMusic: null,
      audioScene: 'none',
      audioState: 'none',
    });

    // Play area - Shrine
    const playAreaShrine: RunState = {
      ...base,
      screen: 'play_area',
      activeHook: {
        type: 'SHRINE',
        shrine: {
          coord: { col: 0, row: 1 },
          turn: 1,
          prayed: false,
        },
      },
    };
    expect(determineActiveAudio(playAreaShrine)).toEqual({
      currentMusic: null,
      audioScene: 'none',
      audioState: 'none',
    });

    // Play area - Game Over
    const playAreaGameOver: RunState = {
      ...base,
      screen: 'play_area',
      activeHook: {
        type: 'ON_GAME_OVER',
        turn: 4,
        defeatedBy: 'Goblin',
      },
    };
    expect(determineActiveAudio(playAreaGameOver)).toEqual({
      currentMusic: null,
      audioScene: 'none',
      audioState: 'none',
    });

    // Play area - Stage Complete
    const playAreaStageComplete: RunState = {
      ...base,
      screen: 'play_area',
      activeHook: {
        type: 'ON_STAGE_COMPLETE',
        turn: 15,
        bossDefeated: 'Goblin Chieftain',
      },
    };
    expect(determineActiveAudio(playAreaStageComplete)).toEqual({
      currentMusic: null,
      audioScene: 'none',
      audioState: 'none',
    });
  });

  it('syncAudioState returns same object if already in sync', () => {
    const s = createInitialState('audio-sync-identity');
    const synced = syncAudioState(s);
    expect(synced).toBe(s);
  });

  it('moving to village stops map music, leaving village resumes map music', () => {
    let s = startAdventure('fighter', 'seed-village-test');
    // Force one of the available choices to be a village
    const avail = Object.values(s.board).find((n) => n.status === 'available');
    expect(avail).toBeDefined();
    if (!avail) return;

    s = {
      ...s,
      board: {
        ...s.board,
        [`${avail.coord.col},${avail.coord.row}`]: {
          ...avail,
          card: {
            ...avail.card,
            hasVillage: true,
            hasHostile: false,
            hasShrine: false,
          },
        },
      },
    };

    const inVillage = chooseCard(s, avail.coord);
    expect(inVillage.activeHook.type).toBe('VILLAGE');
    expect(inVillage.currentMusic).toBeNull();
    expect(inVillage.audioScene).toBe('none');

    // Leaving village resumes map-area music
    const leftVillage = finishVillage(inVillage);
    expect(leftVillage.activeHook.type).toBe('NONE');
    expect(leftVillage.currentMusic).toBe('map-area');
    expect(leftVillage.audioScene).toBe('map');

    // Test villageDoRest also leaves village and returns to map scene
    const inVillage2 = chooseCard(s, avail.coord);
    // Give player enough gold and damage to rest
    if (inVillage2.playerResources) {
      inVillage2.playerResources.hp = 5;
      inVillage2.playerResources.gold = 50;
    }
    const afterRest = villageDoRest(inVillage2);
    expect(afterRest.activeHook.type).toBe('NONE');
    expect(afterRest.currentMusic).toBe('map-area');
    expect(afterRest.audioScene).toBe('map');
  });

  it('moving to shrine stops map music, leaving shrine resumes map music', () => {
    let s = startAdventure('wizard', 'seed-shrine-test');
    const avail = Object.values(s.board).find((n) => n.status === 'available');
    expect(avail).toBeDefined();
    if (!avail) return;

    s = {
      ...s,
      board: {
        ...s.board,
        [`${avail.coord.col},${avail.coord.row}`]: {
          ...avail,
          card: {
            ...avail.card,
            hasShrine: true,
            hasHostile: false,
            hasVillage: false,
          },
        },
      },
    };

    const inShrine = chooseCard(s, avail.coord);
    expect(inShrine.activeHook.type).toBe('SHRINE');
    expect(inShrine.currentMusic).toBeNull();
    expect(inShrine.audioScene).toBe('none');

    // Leaving shrine resumes map-area music
    const leftShrine = leaveShrine(inShrine);
    expect(leftShrine.activeHook.type).toBe('NONE');
    expect(leftShrine.currentMusic).toBe('map-area');
    expect(leftShrine.audioScene).toBe('map');
  });

  it('moving to encounter card plays battle-normal music, and winning resumes map music', () => {
    let s = startAdventure('fighter', 'seed-encounter-audio');
    const avail = Object.values(s.board).find((n) => n.status === 'available');
    expect(avail).toBeDefined();
    if (!avail) return;

    s = {
      ...s,
      board: {
        ...s.board,
        [`${avail.coord.col},${avail.coord.row}`]: {
          ...avail,
          card: {
            ...avail.card,
            hasHostile: true,
            hasVillage: false,
            hasShrine: false,
            level: 1,
          },
        },
      },
    };

    const inCombat = chooseCard(s, avail.coord);
    expect(inCombat.activeHook.type).toBe('COMBAT');
    expect(inCombat.currentMusic).toBe('battle-normal');
    expect(inCombat.audioScene).toBe('battle');

    // If combat ends in victory, battle completes and map music resumes
    if (inCombat.activeHook.type === 'COMBAT') {
      const hook = inCombat.activeHook;
      // Mock one monster with 1 HP and an attack card in hand with high damage
      const targetMonster = hook.combat.monsters[0];
      targetMonster.hp = 1;
      const attackCard = hook.combat.hand[0];
      attackCard.cardType = 'attack';
      attackCard.baseDamage = 99;
      attackCard.accBonus = 10;

      const afterWin = playCard(inCombat, attackCard.instanceId, 0);
      expect(afterWin.activeHook.type).toBe('VICTORY');
      expect(afterWin.currentMusic).toBe(null);
      expect(afterWin.audioScene).toBe('none');

      const afterConfirm = confirmCombatVictory(afterWin);
      expect(afterConfirm.activeHook.type).toBe('NONE');
      expect(afterConfirm.currentMusic).toBe('map-area');
      expect(afterConfirm.audioScene).toBe('map');
    }
  });

  it('combat defeat ends combat and sets music to null with scene none', () => {
    let s = startAdventure('fighter', 'seed-defeat-audio');
    const avail = Object.values(s.board).find((n) => n.status === 'available');
    expect(avail).toBeDefined();
    if (!avail) return;

    s = {
      ...s,
      board: {
        ...s.board,
        [`${avail.coord.col},${avail.coord.row}`]: {
          ...avail,
          card: {
            ...avail.card,
            hasHostile: true,
            hasVillage: false,
            hasShrine: false,
            level: 1,
          },
        },
      },
    };

    const inCombat = chooseCard(s, avail.coord);
    expect(inCombat.activeHook.type).toBe('COMBAT');
    if (inCombat.activeHook.type === 'COMBAT' && inCombat.playerResources) {
      // Set player HP to 1 and ensure monster deals lethal damage
      inCombat.playerResources.hp = 1;
      inCombat.activeHook.combat.playerBlock = 0;
      inCombat.activeHook.combat.monsters[0].monster.pattern = [
        { label: 'Smash', damage: 50, block: 0 },
      ];
      // Give monster guaranteed high ACC
      inCombat.activeHook.combat.monsters[0].monster.acc = 10;

      const afterEnemyTurn = endPlayerCombatTurn(inCombat);
      expect(afterEnemyTurn.activeHook.type).toBe('ON_GAME_OVER');
      expect(afterEnemyTurn.currentMusic).toBeNull();
      expect(afterEnemyTurn.audioScene).toBe('none');
    }
  });

  it('AudioManager instance handles mute, volume and sync in headless environment', () => {
    const mgr = new AudioManager();
    expect(mgr.isTrackMuted()).toBe(false);

    mgr.toggleMute();
    expect(mgr.isTrackMuted()).toBe(true);

    mgr.toggleMute();
    expect(mgr.isTrackMuted()).toBe(false);

    mgr.setVolume(0.8);
    mgr.setVolume(1.5); // clamps to 1.0

    const state = createInitialState('test');
    mgr.sync(state);
    expect(mgr.getCurrentTrack()).toBe('start-screen');

    mgr.stopAll();
    expect(mgr.getCurrentTrack()).toBeNull();
  });
});
