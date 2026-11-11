import { musicEffects } from './music';
import { natureEffects } from './nature';
import { pulseEffects } from './pulse';
import { reactiveEffects } from './reactive';
import { retroEffects } from './retro';
import { spaceEffects } from './space';
import type { EffectDef } from './types';
import { waveEffects } from './wave';

export const EFFECTS: EffectDef[] = [
  ...pulseEffects,
  ...waveEffects,
  ...natureEffects,
  ...spaceEffects,
  ...retroEffects,
  ...reactiveEffects,
  ...musicEffects,
];

export const EFFECT_BY_ID = new Map(EFFECTS.map((e) => [e.id, e]));

export * from './types';
