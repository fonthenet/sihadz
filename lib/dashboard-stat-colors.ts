/**
 * Alternating gradient colors for dashboard stat cards.
 * Use index % length to cycle: card 0 = teal, 1 = cyan, 2 = violet, 3 = emerald, 4 = amber, then repeat.
 * Third card is violet (not green) so nurse "This Week" etc. alternate properly.
 */
export const STAT_CARD_GRADIENTS = [
  { from: 'from-teal-500', to: 'to-teal-600', shadow: 'shadow-teal-500/20', textLight: 'text-teal-100' },
  { from: 'from-cyan-500', to: 'to-cyan-600', shadow: 'shadow-cyan-500/20', textLight: 'text-cyan-100' },
  { from: 'from-violet-500', to: 'to-violet-600', shadow: 'shadow-violet-500/20', textLight: 'text-violet-100' },
  { from: 'from-emerald-500', to: 'to-emerald-600', shadow: 'shadow-emerald-500/20', textLight: 'text-emerald-100' },
  { from: 'from-amber-500', to: 'to-orange-500', shadow: 'shadow-amber-500/20', textLight: 'text-amber-100' },
] as const

export function getStatCardClasses(index: number): string {
  const c = STAT_CARD_GRADIENTS[index % STAT_CARD_GRADIENTS.length]
  return `bg-gradient-to-br ${c.from} ${c.to} text-white border-0 shadow-lg ${c.shadow} cursor-pointer hover:scale-[1.02] transition-transform`
}

export function getStatCardTextLight(index: number): string {
  return STAT_CARD_GRADIENTS[index % STAT_CARD_GRADIENTS.length].textLight
}
