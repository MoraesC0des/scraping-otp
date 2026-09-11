import { GENERATIONS } from './generations.ts';
import { fetchHtml } from './http.ts';
import { parseGenerationPage } from './parser.ts';
import { pageUrl, createLogger } from './utils.ts';
import type { PokemonRecord, PokemonRef, ValidationIssue } from './types.ts';

const log = createLogger();

/**
 * MantÃ©m todas as referÃªncias, removendo apenas entradas idÃªnticas
 * (mesmo nome + slug + nÃºmero), que seriam duplicaÃ§Ãµes reais da pÃ¡gina.
 * Duas entradas distintas que apontem para o mesmo slug (ex.: Nidoranâ™€ e
 * Nidoranâ™‚ compartilhando a pÃ¡gina "/Nidoran") sÃ£o preservadas.
 */
function uniqueRefs(refs: PokemonRef[]): PokemonRef[] {
  const seen = new Set<string>();
  const result: PokemonRef[] = [];
  for (const ref of refs) {
    const key = `${ref.name}\u0000${ref.slug}\u0000${ref.dexNumber ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(ref);
  }
  return result;
}

export interface GenerationPokemon {
  generation: number;
  refs: PokemonRef[];
  /** NÃºmero de pÃ¡ginas de geraÃ§Ã£o que falharam (0 = ok). */
  failed: boolean;
}

/** Coleta a lista de PokÃ©mon das 6 pÃ¡ginas de geraÃ§Ã£o. */
export async function collectGenerationPokemon(): Promise<GenerationPokemon[]> {
  const results: GenerationPokemon[] = [];
  for (const gen of GENERATIONS) {
    const url = pageUrl(gen.slug);
    log.info(`[geraÃ§Ã£o ${gen.number}] buscando ${url}`);
    try {
      const html = await fetchHtml(url);
      const refs = uniqueRefs(parseGenerationPage(html));
      log.info(`[geraÃ§Ã£o ${gen.number}] ${refs.length} PokÃ©mon encontrados`);
      results.push({ generation: gen.number, refs, failed: false });
    } catch (err) {
      log.error(`[geraÃ§Ã£o ${gen.number}] falhou: ${(err as Error).message}`);
      results.push({ generation: gen.number, refs: [], failed: true });
    }
  }
  return results;
}

const SYNTHETIC_ID_START = 90_000;

export interface PokemonAssignResult {
  pokemon: PokemonRecord[];
  issues: ValidationIssue[];
}

/**
 * Converte as referÃªncias das pÃ¡ginas de geraÃ§Ã£o em registros normalizados,
 * usando o nÃºmero da PokÃ©dex como id. Entradas sem nÃºmero ou com id
 * duplicado ganham um id sintÃ©tico e a situaÃ§Ã£o Ã© reportada.
 */
export function assignPokemonIds(generations: GenerationPokemon[]): PokemonAssignResult {
  const pokemon: PokemonRecord[] = [];
  const issues: ValidationIssue[] = [];
  const idByDex = new Map<string, number>();
  let syntheticId = SYNTHETIC_ID_START;

  for (const entry of generations) {
    for (const ref of entry.refs) {
      if (ref.dexNumber) {
        const numeric = Number(ref.dexNumber);
        if (Number.isFinite(numeric) && idByDex.has(ref.dexNumber)) {
          syntheticId += 1;
          issues.push({
            severity: 'warning',
            category: 'identificadores',
            message: `PokÃ©mon "#${ref.dexNumber}" (${ref.name}) repete um nÃºmero jÃ¡ usado; recebeu id sintÃ©tico ${syntheticId}.`,
          });
          pokemon.push({ id: syntheticId, name: ref.name, generation: entry.generation, slug: ref.slug, stats: null, abilities: [] });
          continue;
        }
        if (Number.isFinite(numeric)) {
          idByDex.set(ref.dexNumber, numeric);
          pokemon.push({ id: numeric, name: ref.name, generation: entry.generation, slug: ref.slug, stats: null, abilities: [] });
          continue;
        }
      }

      syntheticId += 1;
      issues.push({
        severity: 'warning',
        category: 'identificadores',
        message: `PokÃ©mon "${ref.name}" (geraÃ§Ã£o ${entry.generation}) nÃ£o tem nÃºmero de PokÃ©dex; recebeu id sintÃ©tico ${syntheticId}.`,
      });
      pokemon.push({ id: syntheticId, name: ref.name, generation: entry.generation, slug: ref.slug, stats: null, abilities: [] });
    }

    if (entry.failed) {
      issues.push({
        severity: 'error',
        category: 'coleta',
        message: `A pÃ¡gina da geraÃ§Ã£o ${entry.generation} nÃ£o pÃ´de ser baixada; nenhum PokÃ©mon dela foi coletado.`,
      });
    }
  }

  return { pokemon, issues };
}

