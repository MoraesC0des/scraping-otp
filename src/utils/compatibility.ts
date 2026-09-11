import type { Dataset, Move, MoveType, Pokemon } from '../types';

/**
 * Índices pré-computados para busca e consulta eficientes sobre
 * o dataset estático (nunca consulta a wiki).
 */
export interface Indexes {
  pokemonById: Map<number, Pokemon>;
  pokemonBySlug: Map<string, Pokemon>;
  movesForPokemon: Map<number, Move[]>;
  moveByKey: Map<string, Move>;
}

export function moveKey(type: MoveType, id: string): string {
  return `${type}::${id}`;
}

export function buildIndexes(dataset: Dataset): Indexes {
  const pokemonById = new Map<number, Pokemon>();
  const pokemonBySlug = new Map<string, Pokemon>();
  const movesForPokemon = new Map<number, Move[]>();

  for (const pokemon of dataset.pokemon) {
    pokemonById.set(pokemon.id, pokemon);
    pokemonBySlug.set(pokemon.slug.toLowerCase(), pokemon);
  }

  for (const move of dataset.moves) {
    for (const pokemonId of move.pokemonIds) {
      let list = movesForPokemon.get(pokemonId);
      if (!list) {
        list = [];
        movesForPokemon.set(pokemonId, list);
      }
      list.push(move);
    }
  }

  const moveByKey = new Map<string, Move>(dataset.moves.map((m) => [moveKey(m.type, m.id), m]));
  return { pokemonById, pokemonBySlug, movesForPokemon, moveByKey };
}

/** Pokémon compatíveis com um move (na ordem em que aparecem no dataset). */
export function compatiblePokemon(indexes: Indexes, move: Move): Pokemon[] {
  const result: Pokemon[] = [];
  for (const id of move.pokemonIds) {
    const pokemon = indexes.pokemonById.get(id);
    if (pokemon) result.push(pokemon);
  }
  return result;
}

function isSameMove(a: Move, b: Move): boolean {
  return a.type === b.type && a.id === b.id;
}

/** Moves que TODOS os Pokémon selecionados aprendem (interseção). */
export function movesForSelection(indexes: Indexes, selectedIds: readonly number[]): Move[] {
  if (selectedIds.length === 0) return [];
  const buckets = selectedIds.map((id) => indexes.movesForPokemon.get(id) ?? []);
  const [first, ...rest] = buckets;
  if (rest.length === 0) return [...first];
  return first.filter((move) =>
    rest.every((list) => list.some((candidate) => isSameMove(candidate, move))),
  );
}

/** Pokémon que aprendem TODOS os moves dados (interseção), na ordem do dataset. */
export function compatiblePokemonForMoves(indexes: Indexes, moves: readonly Move[]): Pokemon[] {
  const [firstMove, ...restMoves] = moves;
  if (!firstMove) return [];
  const restSets = restMoves.map((m) => new Set(m.pokemonIds));
  const result: Pokemon[] = [];
  for (const id of firstMove.pokemonIds) {
    const pokemon = indexes.pokemonById.get(id);
    if (pokemon && restSets.every((set) => set.has(id))) result.push(pokemon);
  }
  return result;
}

/** Verifica se um Pokémon aprende todos os moves dados. */
export function pokemonLearnsAll(pokemonId: number, moves: readonly Move[]): boolean {
  return moves.every((m) => m.pokemonIds.includes(pokemonId));
}

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

/** Verifica se o Pokémon corresponde a uma busca por nome ou número.
 *  Query vazia → sempre true. Insensível a acentos. */
export function pokemonMatchesQuery(pokemon: Pokemon, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return (
    normalize(pokemon.name).includes(q) ||
    String(pokemon.id) === q ||
    String(pokemon.id).padStart(3, '0') === q
  );
}

/** Busca de Pokémon por nome (insensível a acentos) ou número, numa lista. */
export function searchPokemonList(pokemon: Pokemon[], query: string, limit = 8): Pokemon[] {
  if (!normalize(query)) return [];
  return pokemon.filter((p) => pokemonMatchesQuery(p, query)).slice(0, limit);
}

/** Busca de moves por nome ou id (ex.: "TM38", "fire blast"). */
export function searchMoves(moves: readonly Move[], query: string): Move[] {
  const q = normalize(query);
  if (!q) return [...moves];
  return moves.filter(
    (m) => normalize(m.name).includes(q) || normalize(m.id).includes(q),
  );
}