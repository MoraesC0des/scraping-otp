import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { PokemonRef, PokemonMoves, ParsedTM, ParsedMT, PokemonStats } from './types.ts';
import { slugFromHref } from './utils.ts';

const TM_TITLE_RE = /^TM(\d+)\s*-\s*(.+)$/;

/** Palavras usadas pelos ícones de categoria/tipo dentro das células. */
const KNOWN_NOISE = new Set([
  'physical',
  'special',
  'status',
  'grass',
  'fire',
  'water',
  'electric',
  'normal',
  'poison',
  'bug',
  'flying',
  'ground',
  'rock',
  'steel',
  'ghost',
  'psychic',
  'ice',
  'dragon',
  'dark',
  'fairy',
  'fighting',
]);

/**
 * Extrai a lista de Pokémon de uma página de geração.
 * Cada Pokémon fica em um container div.square-box-pokedex.
 */
export function parseGenerationPage(html: string): PokemonRef[] {
  const $ = cheerio.load(html);
  const refs: PokemonRef[] = [];

  $('.square-box-pokedex').each((_, raw) => {
    const box = $(raw);

    const nameLink = box.find('.square-name-pokedex a[href]').first();
    const href = nameLink.attr('href');
    const name = nameLink.text().trim();

    const slug = href ? slugFromHref(href) : null;
    if (!slug || !name) return;

    const dexNumber =
      box
        .find('p')
        .toArray()
        .map((p) => $(p).text().trim())
        .find((text) => /^#?\d{1,4}$/.test(text))
        ?.replace(/^#/, '') ?? null;

    refs.push({ name, slug, dexNumber });
  });

  return refs;
}

/** Coleta os elementos entre um h2 (identificado pelo id) e o próximo h2. */
function sectionAfterHeading(
  $: cheerio.CheerioAPI,
  headlineId: string,
): cheerio.Cheerio<AnyNode> {
  const elements: AnyNode[] = [];
  const h2 = $(`#${headlineId}`).closest('h2');
  if (!h2.length) return $(elements);

  let node = h2.next();
  while (node.length && !node.is('h2')) {
    elements.push(node.toArray()[0]);
    node = node.next();
  }
  return $(elements);
}

const cleanName = (value: string): string => value.trim().replace(/\s+/g, ' ');

/** Links de golpe dentro das células "move" (ignora ícones de tipo/categoria). */
function moveLinkTitles(
  $: cheerio.CheerioAPI,
  cells: cheerio.Cheerio<AnyNode>,
): string[] {
  const titles: string[] = [];
  cells.each((_, raw) => {
    const cell = $(raw);
    let link = cell.find('.t-h > a[title]').first();
    if (!link.length) link = cell.find('a[title]').first();

    const title = link.attr('title') ?? '';
    if (!title) return;

    if (title.includes(':')) return;
    if (title.toLowerCase() === 'tm system') return;
    if (KNOWN_NOISE.has(title.toLowerCase())) return;
    titles.push(cleanName(title));
  });
  return titles;
}

/**
 * Extrai TMs e MTs (Move Tutor) da página individual de um Pokémon.
 *
 * - TMs: células td.b-tm com link title="TM06 - Toxic".
 * - MTs: células td.b-mt-i com link title="Grass Pledge". A wiki não
 *   numera MTs; o identificador original é o próprio nome do golpe.
 */
export function parsePokemonPage(html: string): PokemonMoves {
  const $ = cheerio.load(html);
  const tms: ParsedTM[] = [];

  const tmsSection = sectionAfterHeading($, 'TMs');
  tmsSection.find('td.b-tm a[title]').each((_, raw) => {
    const title = $(raw).attr('title') ?? '';
    const match = title.match(TM_TITLE_RE);
    if (!match) return;
    const id = match[1].trim();
    tms.push({ id: `TM${id}`, name: cleanName(match[2]) });
  });

  const mtSection = sectionAfterHeading($, 'Move_Tutor');
  const mtTitles = moveLinkTitles($, mtSection.find('td.b-mt-i'));
  const mts: ParsedMT[] = mtTitles.map((name) => ({ name }));

  return { tms: uniqueTMs(tms), mts: uniqueMTs(mts) };
}

function uniqueTMs(items: ParsedTM[]): ParsedTM[] {
  const seen = new Map<string, ParsedTM>();
  for (const item of items) {
    if (!seen.has(item.id)) seen.set(item.id, item);
  }
  return [...seen.values()];
}

function uniqueMTs(items: ParsedMT[]): ParsedMT[] {
  const seen = new Map<string, ParsedMT>();
  for (const item of items) {
    const key = item.name.toLowerCase();
    if (!seen.has(key)) seen.set(key, item);
  }
  return [...seen.values()];
}

const STAT_KEYS: Record<string, keyof PokemonStats> = {
  'hp': 'hp',
  'attack': 'attack',
  'defense': 'defense',
  'sp attack': 'spAttack',
  'sp. attack': 'spAttack',
  'sp defense': 'spDefense',
  'sp. defense': 'spDefense',
  'speed': 'speed',
};

function normalizeStatLabel(label: string): string {
  return label.replace(/[:.]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Extrai as habilidades de campo da caixa "Habilidades" da página do Pokémon
 * (links para /Habilidades_dos_Pokemon#Habilidade_X). Pokémon sem a caixa
 * retornam lista vazia.
 */
export function parseAbilities(html: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const abilities: string[] = [];

  $('a[href*="Habilidades_dos_Pokemon#Habilidade_"]').each((_, raw) => {
    const text = $(raw).text().trim();
    if (text && !seen.has(text)) {
      seen.add(text);
      abilities.push(text);
    }
  });

  return abilities;
}

/**
 * Extrai os status (multiplicadores) da seção "Status" da página de um
 * Pokémon. A tabela aparece em dois formatos pela wiki:
 *   <td class="s-01">HP:</td> ... <td class="s-03">1.35</td>
 *   ou células estilizadas sem classes: <td>HP:</td> ... <td>1.15</td>
 * Em ambos, o rótulo é a primeira célula e o valor a última de cada linha.
 */
export function parseStatusSection(html: string): PokemonStats | null {
  const $ = cheerio.load(html);
  const stats: Partial<PokemonStats> = {};
  const section = sectionAfterHeading($, 'Status');

  section.find('tr').each((_, rawRow) => {
    const tds = $(rawRow).find('td');
    if (tds.length < 2) return;

    const label = $(tds[0]).text().trim().toLowerCase();
    const key = STAT_KEYS[normalizeStatLabel(label)];
    if (!key) return;

    const valueText = $(tds[tds.length - 1]).text().trim();
    const value = parseFloat(valueText.replace(',', '.'));
    if (Number.isFinite(value)) stats[key] = value;
  });

  const required: Array<keyof PokemonStats> = ['hp', 'attack', 'defense', 'spAttack', 'spDefense', 'speed'];
  if (required.some((key) => stats[key] === undefined)) return null;
  return stats as PokemonStats;
}

/**
 * Extrai a lista canônica de TMs da página TM_System
 * (títulos "TM01 - Fly", ...).
 */
export function parseCanonicalTMs(html: string): ParsedTM[] {
  const $ = cheerio.load(html);
  const tms: ParsedTM[] = [];
  const section = sectionAfterHeading($, 'Technical_Machine');
  section.find('a[title]').each((_, raw) => {
    const title = $(raw).attr('title') ?? '';
    const match = title.match(TM_TITLE_RE);
    if (!match) return;
    tms.push({ id: `TM${match[1].trim()}`, name: cleanName(match[2]) });
  });
  return uniqueTMs(tms);
}

/**
 * Extrai a lista canônica de MTs da página TM_System
 * (seção "Move Tutor": links por nome do golpe).
 */
export function parseCanonicalMTs(html: string): string[] {
  const $ = cheerio.load(html);
  const names: string[] = [];
  const section = sectionAfterHeading($, 'Move_Tutor');
  section.find('b.loot-title a[title]').each((_, raw) => {
    const name = cleanName($(raw).attr('title') ?? '');
    if (!name || name.includes(':')) return;
    names.push(name);
  });
  return dedupe(names);
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}