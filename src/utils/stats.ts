import type { Pokemon } from '../types';

export type StatKey = 'id' | 'hp' | 'attack' | 'defense' | 'spAttack' | 'spDefense' | 'speed' | 'total';
export type SortDir = 'asc' | 'desc';

export interface SortCriterion {
  key: StatKey;
  dir: SortDir;
}

export interface StatMeta {
  key: StatKey;
  label: string;
  /** Multiplicadores acima deste valor são "especialistas". Usado na barra. */
  max: number;
}

export const STAT_OPTIONS: StatMeta[] = [
  { key: 'id', label: 'Número', max: 0 },
  { key: 'hp', label: 'HP', max: 8 },
  { key: 'attack', label: 'Attack', max: 8 },
  { key: 'defense', label: 'Defense', max: 8 },
  { key: 'spAttack', label: 'Sp. Attack', max: 8 },
  { key: 'spDefense', label: 'Sp. Defense', max: 8 },
  { key: 'speed', label: 'Speed', max: 8 },
  { key: 'total', label: 'Total', max: 40 },
];

export const STAT_META_BY_KEY: Record<StatKey, StatMeta> = STAT_OPTIONS.reduce(
  (acc, meta) => {
    acc[meta.key] = meta;
    return acc;
  },
  {} as Record<StatKey, StatMeta>,
);

export function statValue(pokemon: Pokemon, key: StatKey): number | null {
  if (key === 'id') return pokemon.id;
  if (!pokemon.stats) return null;
  if (key === 'total') {
    const s = pokemon.stats;
    return s.hp + s.attack + s.defense + s.spAttack + s.spDefense + s.speed;
  }
  return pokemon.stats[key];
}

/** Rótulo do valor de uma stat para exibição (ex.: "1.35×"). */
export function statLabel(key: StatKey): string {
  return STAT_META_BY_KEY[key].label;
}

/** Compara dois Pokémon por uma lista (ordenada) de critérios de prioridade. */
export function comparePokemon(
  a: Pokemon,
  b: Pokemon,
  criteria: readonly SortCriterion[],
): number {
  for (const { key, dir } of criteria) {
    const av = statValue(a, key);
    const bv = statValue(b, key);
    const aNull = av == null;
    const bNull = bv == null;
    if (aNull && bNull) continue;
    if (aNull) return 1;
    if (bNull) return -1;
    if (av === bv) continue;
    return dir === 'asc' ? av - bv : bv - av;
  }
  return a.id - b.id;
}

/** Marca um critério de ordenação como "novo", com estado inicial padrão. */
export function nextCriterion(existing: readonly SortCriterion[]): SortCriterion {
  const used = new Set(existing.map((c) => c.key));
  const free = STAT_OPTIONS.find((o) => !used.has(o.key));
  return { key: free ? free.key : 'total', dir: 'asc' };
}