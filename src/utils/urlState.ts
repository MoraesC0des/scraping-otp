import type { Move } from '../types';
import { moveKey } from './compatibility';
import type { Indexes } from './compatibility';

export const URL_PATH = '/pokemon';

export interface UrlSelection {
  pokemonIds: number[];
  moveKeys: string[];
}

/** Serializa a seleção atual para a URL (?selected=a,b&moves=TM::TM01,MT::Swords%20Dance). */
export function selectionToUrl(
  pokemonIds: readonly number[],
  moves: readonly Move[],
  indexes: Indexes,
): string {
  const params = new URLSearchParams();

  if (pokemonIds.length > 0) {
    const slugs = pokemonIds
      .map((id) => indexes.pokemonById.get(id)?.slug)
      .filter((slug): slug is string => Boolean(slug))
      .map((slug) => slug.toLowerCase())
      .map(encodeURIComponent);
    params.set('selected', slugs.join(','));
  }

  if (moves.length > 0) {
    params.set(
      'moves',
      moves.map((m) => encodeURIComponent(moveKey(m.type, m.id))).join(','),
    );
  }

  const query = params.toString();
  return query ? `${URL_PATH}?${query}` : URL_PATH;
}

/** Lê a seleção a partir da URL. */
export function selectionFromUrl(search: string, indexes: Indexes): UrlSelection {
  const params = new URLSearchParams(search);
  const selection: UrlSelection = { pokemonIds: [], moveKeys: [] };

  const rawSelected = params.get('selected');
  if (rawSelected) {
    for (const encoded of rawSelected.split(',')) {
      const slug = decodeURIComponent(encoded.trim()).toLowerCase();
      if (!slug) continue;
      const id = indexes.pokemonBySlug.get(slug)?.id;
      if (id != null) selection.pokemonIds.push(id);
    }
  }

  const rawMoves = params.get('moves');
  if (rawMoves) {
    for (const encoded of rawMoves.split(',')) {
      const key = decodeURIComponent(encoded.trim());
      if (key && indexes.moveByKey.has(key)) selection.moveKeys.push(key);
    }
  }

  return selection;
}

/** Reflete a seleção na URL sem adicionar histórico de navegação. */
export function applySelectionToUrl(
  pokemonIds: readonly number[],
  moves: readonly Move[],
  indexes: Indexes,
): void {
  const target = selectionToUrl(pokemonIds, moves, indexes);
  const current = window.location.pathname + window.location.search;
  if (current !== target) {
    window.history.replaceState(null, '', target);
  }
}