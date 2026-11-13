import type { ActionHandler } from '../types';
import { combatActions } from './combat';
import { navigationAndModalActions } from './navigationAndModals';
import { villageAndShrineActions } from './villageAndShrine';

/** Central action dispatch table keyed by `data-action` attribute values. */
export const ACTION_HANDLERS: Record<string, ActionHandler> = {
  ...navigationAndModalActions,
  ...villageAndShrineActions,
  ...combatActions,
};
