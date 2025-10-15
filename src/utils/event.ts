import { EventEmitter } from 'eventemitter3';
import type { CraneInfo } from '../types';

export const EventName = {
  ADD_CRANE: 'add-crane',
  REMOVE_CRANE: 'remove-crane',
  UPDATE_CRANE: 'update-crane',
  CRANE_CLICKED: 'crane-clicked',
} as const;

export type EventName = typeof EventName[keyof typeof EventName];

export interface CraneClickedEvent {
  crane: CraneInfo;
  screenPosition: { x: number; y: number };
}

export const EventBus = new EventEmitter();