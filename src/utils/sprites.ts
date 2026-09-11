export const SPRITE_BASE =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

/** Url do sprite oficial (PokeAPI via GitHub CDN) ou null quando indisponível. */
export function spriteUrl(id: number): string | null {
  if (id >= 90_000) return null;
  return `${SPRITE_BASE}/${id}.png`;
}