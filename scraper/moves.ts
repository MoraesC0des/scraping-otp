import { fetchHtml } from './http.ts';
import { parsePokemonPage, parseStatusSection, parseAbilities } from './parser.ts';
import { pageUrl, mapConcurrent, sleep, createLogger } from './utils.ts';
import { REQUEST_DELAY_MS, CONCURRENCY } from './config.ts';
import type {
  MoveRecord,
  ParsedMT,
  ParsedTM,
  PokemonMoves,
  PokemonRecord,
  PokemonStats,
  ValidationIssue,
} from './types.ts';

const log = createLogger();

export interface MoveScrapeResult {
  moves: MoveRecord[];
  /** TM id → nome canônico observado. */
  tmNameById: Map<string, string>;
  /** Nome (lowercase) → nome real de cada MT observado. */
  mtNameByKey: Map<string, string>;
  /** golpes por Pokémon, usados na validação cruzada. */
  rawByPokemon: Map<number, PokemonMoves>;
  /** status por Pokémon (multiplicadores da seção "Status"). */
  statsByPokemon: Map<number, PokemonStats>;
  /** habilidades de campo por Pokémon (caixa "Habilidades"). */
  abilitiesByPokemon: Map<number, string[]>;
  issues: ValidationIssue[];
  /** Pokémon cuja página individual falhou na coleta. */
  failures: Array<{ name: string; slug: string; message: string }>;
}

/** Coleta a página individual de cada Pokémon e agrega TMs/MTs. */
export async function collectPokemonMoves(pokemon: PokemonRecord[]): Promise<MoveScrapeResult> {
  const rawByPokemon = new Map<number, PokemonMoves>();
  const statsByPokemon = new Map<number, PokemonStats>();
  const abilitiesByPokemon = new Map<number, string[]>();
  const issues: ValidationIssue[] = [];
  const failures: Array<{ name: string; slug: string; message: string }> = [];

  const tmBuckets = new Map<string, { name: string; ids: Set<number> }>();
  const mtBuckets = new Map<string, { name: string; ids: Set<number> }>();

  let done = 0;
  await mapConcurrent(pokemon, CONCURRENCY, async (mon, index) => {
    await sleep(index % CONCURRENCY === 0 ? REQUEST_DELAY_MS : 0);

    const url = pageUrl(mon.slug);
    try {
      const html = await fetchHtml(url);
      const parsed = parsePokemonPage(html);
      rawByPokemon.set(mon.id, parsed);

      const stats = parseStatusSection(html);
      if (stats) statsByPokemon.set(mon.id, stats);

      const abilities = parseAbilities(html);
      if (abilities.length > 0) abilitiesByPokemon.set(mon.id, abilities);

      for (const tm of parsed.tms) mergeTM(tmBuckets, tm, mon.id, issues, mon.name);
      for (const mt of parsed.mts) mergeMT(mtBuckets, mt, mon.id);

      done += 1;
      if (done % 50 === 0) {
        log.info(`pokémon processados: ${done}/${pokemon.length} (TM ${tmBuckets.size}, MT ${mtBuckets.size})`);
      }
    } catch (err) {
      failures.push({
        name: mon.name,
        slug: mon.slug,
        message: (err as Error).message,
      });
      done += 1;
    }
  });

  const moves = aggregateMoves(tmBuckets, mtBuckets);
  log.info(`coleta concluída: ${moves.length} golpes (${tmBuckets.size} TMs, ${mtBuckets.size} MTs), ${statsByPokemon.size} com status`);
  log.info(
    `status ausentes: ${pokemon.length - statsByPokemon.size} Pokémon sem a seção "Status"`,
  );
  log.info(`habilidades coletadas: ${abilitiesByPokemon.size} Pokémon com habilidades`);

  return {
    moves,
    tmNameById: new Map([...tmBuckets].map(([id, v]) => [id, v.name])),
    mtNameByKey: new Map([...mtBuckets].map(([k, v]) => [k, v.name])),
    rawByPokemon,
    statsByPokemon,
    abilitiesByPokemon,
    issues,
    failures,
  };
}

function mergeTM(
  buckets: Map<string, { name: string; ids: Set<number> }>,
  tm: ParsedTM,
  pokemonId: number,
  issues: ValidationIssue[],
  pokemonName: string,
): void {
  const bucket = buckets.get(tm.id);
  if (!bucket) {
    buckets.set(tm.id, { name: tm.name, ids: new Set([pokemonId]) });
    return;
  }
  if (bucket.name.toLowerCase() !== tm.name.toLowerCase()) {
    issues.push({
      severity: 'warning',
      category: 'consistência',
      message:
        `"${tm.id}" aparece com nomes diferentes na wiki: "${bucket.name}" (outros Pokémon) vs ` +
        `"${tm.name}" (${pokemonName}).`,
    });
  }
  bucket.ids.add(pokemonId);
}

function mergeMT(
  buckets: Map<string, { name: string; ids: Set<number> }>,
  mt: ParsedMT,
  pokemonId: number,
): void {
  const key = mt.name.toLowerCase();
  const bucket = buckets.get(key);
  if (!bucket) {
    buckets.set(key, { name: mt.name, ids: new Set([pokemonId]) });
    return;
  }
  bucket.ids.add(pokemonId);
}

function aggregateMoves(
  tmBuckets: Map<string, { name: string; ids: Set<number> }>,
  mtBuckets: Map<string, { name: string; ids: Set<number> }>,
): MoveRecord[] {
  const tms: MoveRecord[] = [...tmBuckets]
    .map(([id, v]) => ({
      id,
      name: v.name,
      type: 'TM' as const,
      pokemonIds: sortedIds(v.ids),
    }))
    .sort((a, b) => tmNumber(a.id) - tmNumber(b.id));

  const mts: MoveRecord[] = [...mtBuckets]
    .map(([, v]) => ({
      id: v.name,
      name: v.name,
      type: 'MT' as const,
      pokemonIds: sortedIds(v.ids),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return [...tms, ...mts];
}

function sortedIds(ids: Set<number>): number[] {
  return [...ids].sort((a, b) => a - b);
}

function tmNumber(id: string): number {
  const match = id.match(/^TM(\d+)$/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}