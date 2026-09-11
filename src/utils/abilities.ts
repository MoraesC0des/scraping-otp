import type { Dataset } from '../types';

/** Lista distinta de habilidades de campo presente no dataset, em ordem alfabética. */
export function abilityOptions(dataset: Dataset): string[] {
  const set = new Set<string>();
  for (const pokemon of dataset.pokemon) {
    for (const ability of pokemon.abilities) set.add(ability);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}