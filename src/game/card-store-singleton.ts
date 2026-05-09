import { LocalStorageCardStore } from './fsrs-scheduler';

/** Process-wide singleton so App.tsx (retry revert) and Lesson.tsx (read/write) share state. */
export const cardStore = new LocalStorageCardStore();
