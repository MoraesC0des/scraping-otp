import type { GenerationInfo } from './types.ts';

/**
 * Páginas oficiais das gerações na wiki do OT Pokémon.
 * A ordem da lista define a geração de introdução de cada Pokémon.
 */
export const GENERATIONS: GenerationInfo[] = [
  { number: 1, title: 'Primeira Geração', slug: 'Primeira_Geração' },
  { number: 2, title: 'Segunda Geração', slug: 'Segunda_Geração' },
  { number: 3, title: 'Terceira Geração', slug: 'Terceira_Geração' },
  { number: 4, title: 'Quarta Geração', slug: 'Quarta_Geração' },
  { number: 5, title: 'Quinta Geração', slug: 'Quinta_Geração' },
  { number: 6, title: 'Sexta Geração', slug: 'Sexta_Geração' },
];

/** URLs das páginas de apoio usadas na validação. */
export const SUPPORT_PAGES = {
  /** Página que lista todos os TMs e MTs existentes no jogo. */
  tmSystem: 'TM_System',
} as const;