import { syncAudioState } from '../core/audio';
import { RunState } from '../core/types';

type Listener = (state: RunState) => void;

export class Store {
  private state: RunState;
  private listeners: Listener[] = [];

  constructor(initial: RunState, private readonly clock: () => string = () => {
    const now = new Date();
    const date = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((n) => String(n).padStart(2, '0'))
      .join(':');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${date} ${time}.${ms}`;
  }) {
    this.state = syncAudioState(initial);
  }

  get(): RunState {
    return this.state;
  }

  set(next: RunState): void {
    const synced = syncAudioState(next);
    if (synced === this.state) return;
    this.state = synced;
    for (const l of this.listeners) l(synced);
  }

  update(fn: (s: RunState) => RunState): void {
    const input = { ...this.state, logTimestamp: this.clock() };
    const next = fn(input);
    if (next !== input) this.set(next);
  }

  subscribe(l: Listener): void {
    this.listeners.push(l);
  }
}
