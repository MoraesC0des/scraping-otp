import { fetchHtml } from './http.ts';
import { pageUrl, createLogger } from './utils.ts';
import { parseCanonicalTMs, parseCanonicalMTs } from './parser.ts';
import { SUPPORT_PAGES } from './generations.ts';
import type {
  Dataset,
  MoveRecord,
  MoveType,
  PokemonMoves,
  PokemonRecord,
  ValidationIssue,
  ValidationReport,
} from './types.ts';

const log = createLogger();

export interface ValidationInput {
  dataset: Dataset;
  rawByPokemon: Map<number, PokemonMoves>;
  collectedIssues: ValidationIssue[];
}

export interface CanonicalLists {
  tms: Map<string, string>;
  mts: Set<string>;
  loaded: boolean;
}

/** Busca as listas canônicas de TMs/MTs na página TM_System. */
export async function loadCanonicalLists(): Promise<CanonicalLists> {
  try {
    const html = await fetchHtml(pageUrl(SUPPORT_PAGES.tmSystem));
    const canonicalTms = parseCanonicalTMs(html);
    const canonicalMts = parseCanonicalMTs(html);
    return {
      tms: new Map(canonicalTms.map((t) => [t.id, t.name])),
      mts: new Set(canonicalMts.map((n) => n.toLowerCase())),
      loaded: true,
    };
  } catch (err) {
    log.warn(`não foi possível buscar a página TM_System: ${(err as Error).message}`);
    return { tms: new Map(), mts: new Set(), loaded: false };
  }
}

/**
 * Valida o dataset cruzando as duas direções:
 * Pokémon → TMs/MTs  e  TM/MT → Pokémon compatíveis.
 * Problemas são registrados no relatório, nunca corrigidos em silêncio.
 */
export function buildValidationReport(
  input: ValidationInput,
  canonical: CanonicalLists,
  pokemonCount: number,
  failures: readonly { name: string; slug: string; message: string }[],
): ValidationReport {
  const issues: ValidationIssue[] = [...input.collectedIssues];
  const { dataset, rawByPokemon } = input;

  const moveById = new Map(dataset.moves.map((m) => [moveKey(m.type, m.id), m]));
  const pokemonById = new Map(dataset.pokemon.map((p) => [p.id, p]));

  // --- TM/MT → Pokémon ---
  for (const move of dataset.moves) {
    if (canonical.loaded) {
      if (move.type === 'TM') {
        const canonicalName = canonical.tms.get(move.id);
        if (canonicalName === undefined) {
          issues.push({
            severity: 'warning',
            category: 'consistência',
            message: `O TM "${move.id} - ${move.name}" não está na lista canônica da página TM_System.`,
          });
        } else if (canonicalName.toLowerCase() !== move.name.toLowerCase()) {
          issues.push({
            severity: 'warning',
            category: 'consistência',
            message:
              `O nome do "${move.id}" difere entre páginas: Pokémon = "${move.name}", TM_System = "${canonicalName}".`,
          });
        }
      } else if (!canonical.mts.has(move.name.toLowerCase())) {
        issues.push({
          severity: 'warning',
          category: 'consistência',
          message: `O Move Tutor "${move.name}" não está na lista canônica da página TM_System.`,
        });
      }
    }

    for (const pokemonId of move.pokemonIds) {
      const raw = rawByPokemon.get(pokemonId);
      if (!raw) {
        issues.push({
          severity: 'error',
          category: 'validação cruzada',
          message: `"${formatMove(move)}" lista o Pokémon de id ${pokemonId}, mas não há dados crus para ele.`,
        });
        continue;
      }
      if (!hasMove(raw, move.type, move.id)) {
        issues.push({
          severity: 'error',
          category: 'validação cruzada',
          message:
            `"${formatMove(move)}" lista o Pokémon id ${pokemonId} (` +
            `${pokemonById.get(pokemonId)?.name ?? '?'}), mas a página dele não confirma esse golpe.`,
        });
      }
    }
  }

  // --- Pokémon → TMs/MTs ---
  for (const [pokemonId, raw] of rawByPokemon) {
    for (const tm of raw.tms) {
      const move = moveById.get(moveKey('TM', tm.id));
      if (!move || !move.pokemonIds.includes(pokemonId)) {
        issues.push({
          severity: 'error',
          category: 'validação cruzada',
          message:
            `Pokémon id ${pokemonId} (${pokemonById.get(pokemonId)?.name ?? '?'}) aprende ` +
            `"${tm.id} - ${tm.name}" segundo a página dele, mas a entrada do move não confirma.`,
        });
      }
    }
    for (const mt of raw.mts) {
      const move = moveById.get(moveKey('MT', mt.name));
      if (!move || !move.pokemonIds.includes(pokemonId)) {
        issues.push({
          severity: 'error',
          category: 'validação cruzada',
          message:
            `Pokémon id ${pokemonId} (${pokemonById.get(pokemonId)?.name ?? '?'}) aprende ` +
            `o Move Tutor "${mt.name}" segundo a página dele, mas a entrada do move não confirma.`,
        });
      }
    }
  }

  // --- Entradas canônicas sem aprendizes ---
  if (canonical.loaded) {
    const observedTmIds = new Set(dataset.moves.filter((m) => m.type === 'TM').map((m) => m.id));
    for (const [tmId, name] of canonical.tms) {
      if (!observedTmIds.has(tmId)) {
        issues.push({
          severity: 'info',
          category: 'cobertura',
          message: `O TM "${tmId} - ${name}" não é aprendido por nenhum Pokémon coletado (1ª a 6ª geração).`,
        });
      }
    }
    const observedMtKeys = new Set(
      dataset.moves.filter((m) => m.type === 'MT').map((m) => m.name.toLowerCase()),
    );
    for (const mtName of canonical.mts) {
      if (!observedMtKeys.has(mtName)) {
        issues.push({
          severity: 'info',
          category: 'cobertura',
          message: `O Move Tutor "${mtName}" não é aprendido por nenhum Pokémon coletado (1ª a 6ª geração).`,
        });
      }
    }
  }

  for (const failure of failures) {
    issues.push({
      severity: 'error',
      category: 'coleta',
      message: `Página de "${failure.name}" (${failure.slug}) falhou: ${failure.message}`,
    });
  }

  issues.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      pokemonCount,
      tmCount: dataset.moves.filter((m) => m.type === 'TM').length,
      mtCount: dataset.moves.filter((m) => m.type === 'MT').length,
      pokemonPagesFetched: dataset.pokemon.length,
      pokemonPagesFailed: failures.length,
      issues: issues.length,
    },
    issues,
  };
}

function moveKey(type: MoveType, id: string): string {
  return `${type}::${id}`;
}

function formatMove(move: MoveRecord): string {
  return move.type === 'TM' ? `${move.id} - ${move.name}` : `MT "${move.name}"`;
}

function hasMove(raw: PokemonMoves, type: MoveType, id: string): boolean {
  if (type === 'TM') return raw.tms.some((t) => t.id === id);
  return raw.mts.some((m) => m.name.toLowerCase() === id.toLowerCase());
}

function severityRank(severity: ValidationIssue['severity']): number {
  return { error: 0, warning: 1, info: 2 }[severity];
}

export function summarizePokemonMoves(dataset: Dataset): string {
  const tmNames = dataset.moves.filter((m) => m.type === 'TM').map((m) => m.name);
  return `TMs: ${tmNames.length}, MTs: ${dataset.moves.filter((m) => m.type === 'MT').length}`;
}

export function knownPokemon(name: string, dataset: Dataset): PokemonRecord | undefined {
  return dataset.pokemon.find((p) => p.name.toLowerCase() === name.toLowerCase());
}