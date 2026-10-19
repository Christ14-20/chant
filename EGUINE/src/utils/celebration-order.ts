export const DEFAULT_CELEBRATION_SLOT_IDS = [
  'entree',
  'kyrie',
  'gloria',
  'psaume',
  'acclamation',
  'credo',
  'priere_universelle',
  'offertoire',
  'sanctus',
  'agnus_dei',
  'communion',
  'action_grace',
  'chant_final',
];

export function getEffectiveSlotOrder(slotOrder: string[] | undefined, slotIds: string[]): string[] {
  const baseline = Array.isArray(slotOrder)
    ? slotOrder.filter((value) => typeof value === 'string' && slotIds.includes(value))
    : [];

  const appended = slotIds.filter((slotId) => !baseline.includes(slotId));
  return [...new Set([...baseline, ...appended])];
}

export function reorderCelebrationSlotIds(
  slotOrder: string[] | undefined,
  slotId: string,
  direction: -1 | 1,
  slotIds: string[]
): string[] {
  const ordered = getEffectiveSlotOrder(slotOrder, slotIds);
  const index = ordered.indexOf(slotId);
  if (index === -1) return ordered;

  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= ordered.length) return ordered;

  const reordered = [...ordered];
  [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
  return reordered;
}
