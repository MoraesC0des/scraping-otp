import * as fs from 'node:fs';
import * as path from 'node:path';
import { assignPokemonIds, collectGenerationPokemon } from './pokemon.ts';
import { collectPokemonMoves } from './moves.ts';
import { buildValidationReport, loadCanonicalLists } from './validate.ts';
import { DATA_DIR } from './config.ts';
import { createLogger } from './utils.ts';
import type { Dataset, PokemonRecord, ValidationReport } from './types.ts';

const log = createLogger();

function ensureDataDir(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  log.info('>>> OTPokémon TM/MT Finder - coleta de dados');

  ensureDataDir();

  // 1. Páginas de geração 1..6 → lista de Pokémon
  const generations = await collectGenerationPokemon();
  const { pokemon, issues: idIssues } = assignPokemonIds(generations);
  log.info(`total coletado: ${pokemon.length} Pokémon de ${generations.length} gerações`);

  // 2. Página individual de cada Pokémon → TMs e MTs + status
  const movesResult = await collectPokemonMoves(pokemon);
  const withStats = pokemon.map((mon) => ({
    ...mon,
    stats: movesResult.statsByPokemon.get(mon.id) ?? null,
    abilities: movesResult.abilitiesByPokemon.get(mon.id) ?? [],
  }));

  // 3. Dataset normalizado
  const dataset: Dataset = { pokemon: withStats, moves: movesResult.moves };
  const pokemonPath = path.join(DATA_DIR, 'pokemon.json');
  const movesPath = path.join(DATA_DIR, 'moves.json');
  fs.writeFileSync(pokemonPath, JSON.stringify({ pokemon: withStats }, null, 2), 'utf8');
  fs.writeFileSync(movesPath, JSON.stringify({ moves: movesResult.moves }, null, 2), 'utf8');
  log.info(`dataset salvo em ${DATA_DIR}`);

  // 4. Validação (lista canônica + cruzamento Pokémon ↔ moves)
  const canonical = await loadCanonicalLists();
  const report: ValidationReport = buildValidationReport(
    {
      dataset,
      rawByPokemon: movesResult.rawByPokemon,
      collectedIssues: [...idIssues, ...movesResult.issues],
    },
    canonical,
    pokemon.length,
    movesResult.failures,
  );
  fs.writeFileSync(
    path.join(DATA_DIR, 'validation-report.json'),
    JSON.stringify(report, null, 2),
    'utf8',
  );
  log.info(
    `validação: ${report.summary.issues} problema(s) registrado(s) ` +
      `(${report.issues.filter((i) => i.severity === 'error').length} erros)`,
  );

  // 5. Verificação de Pokémons conhecidos
  verifyKnownPokemon(pokemon, movesResult.moves);

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  log.info(`>>> coleta concluída em ${elapsed}s`);
}

function verifyKnownPokemon(pokemon: PokemonRecord[], moves: Dataset['moves']): void {
  const targetNames = ['Bulbasaur', 'Charizard', 'Pikachu'];

  for (const target of targetNames) {
    const mon = pokemon.find((p) => p.name === target);
    if (!mon) {
      log.warn(`verificação: ${target} não encontrado no dataset`);
      continue;
    }
    const tms = moves
      .filter((m) => m.type === 'TM' && m.pokemonIds.includes(mon.id))
      .map((m) => m.id);
    const mts = moves
      .filter((m) => m.type === 'MT' && m.pokemonIds.includes(mon.id))
      .map((m) => m.name);
    log.info(
      `verificação: ${target} (id ${mon.id}) → ${tms.length} TMs, ${mts.length} MTs ` +
        `| TMs: ${tms.join(', ')} | MTs: ${mts.join(', ')}`,
    );
  }
}

main().catch((err) => {
  log.error(`falha na execução: ${(err as Error).message}`);
  process.exit(1);
});