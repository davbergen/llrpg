export const GEMS_PER_BOSS = 5;
export const GEMS_PER_STREAK_MILESTONE = 1;
export const GEMS_RETRY_COST = 5;

export type GemSource =
  | 'boss_kill'
  | 'streak_milestone'
  | 'lesson_retry'
  | 'debug';

export interface GemEntry {
  /** Epoch ms. */
  at: number;
  /** Positive for credit, negative for debit. */
  delta: number;
  source: GemSource;
  note?: string;
}

export interface GemLedger {
  balance: number;
  entries: GemEntry[];
}

export function initialGemLedger(): GemLedger {
  return { balance: 0, entries: [] };
}

function append(ledger: GemLedger, entry: GemEntry): GemLedger {
  return {
    balance: ledger.balance + entry.delta,
    entries: [...ledger.entries, entry],
  };
}

export function creditGems(
  ledger: GemLedger,
  amount: number,
  source: GemSource,
  now: number,
  note?: string,
): GemLedger {
  if (amount <= 0) throw new Error(`creditGems requires positive amount; got ${amount}`);
  return append(ledger, { at: now, delta: amount, source, note });
}

export function debitGems(
  ledger: GemLedger,
  amount: number,
  source: GemSource,
  now: number,
  note?: string,
): GemLedger {
  if (amount <= 0) throw new Error(`debitGems requires positive amount; got ${amount}`);
  if (ledger.balance < amount) {
    throw new Error(`Insufficient gems: balance=${ledger.balance}, debit=${amount}`);
  }
  return append(ledger, { at: now, delta: -amount, source, note });
}

export function canAffordGems(ledger: GemLedger, amount: number): boolean {
  return ledger.balance >= amount;
}
