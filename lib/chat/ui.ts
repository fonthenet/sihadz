/** Distinctive gradient classes for avatars when no photo. Use a unique seed per contact (e.g. user id, thread id). */
export function avatarGradientFor(seed: string): string {
  const palette = [
    'from-emerald-400 to-teal-500',
    'from-cyan-400 to-sky-500',
    'from-violet-400 to-purple-500',
    'from-fuchsia-400 to-pink-500',
    'from-amber-400 to-orange-500',
    'from-rose-400 to-red-500',
    'from-blue-500 to-indigo-500',
    'from-lime-400 to-emerald-500',
    'from-sky-400 to-blue-500',
    'from-indigo-400 to-violet-500',
    'from-orange-400 to-amber-500',
    'from-pink-400 to-rose-500',
  ]
  // djb2-like hash for better distribution across palette
  let h = 5381
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0
  }
  return palette[Math.abs(h) % palette.length]
}

