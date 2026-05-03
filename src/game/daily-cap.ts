export function canUseAbility(now: number, lastUsedAt: number | null): boolean {
  if (lastUsedAt == null) return true;
  const a = new Date(now);
  const b = new Date(lastUsedAt);
  return (
    a.getFullYear() !== b.getFullYear() ||
    a.getMonth() !== b.getMonth() ||
    a.getDate() !== b.getDate()
  );
}
