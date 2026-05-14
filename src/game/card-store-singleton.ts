import { PersistentCardStore } from './fsrs-scheduler';
import { getCardStorage } from '../repos/cardStorage';

/** Process-wide singleton so App.tsx (retry revert) and Lesson.tsx (read/write) share state. */
export const cardStore = new PersistentCardStore(getCardStorage());
