import * as fs from 'node:fs';

export const WIKI_BASE = 'https://wiki.otponline.com';

/** Diretório de cache local (HTML baixado + cookies de sessão). */
export const CACHE_DIR = process.env.SCRAPE_CACHE_DIR || '.scrape-cache';

/** Diretório onde os JSONs finais são gravados. */
export const DATA_DIR = process.env.SCRAPE_DATA_DIR || 'data';

/** Atraso mínimo entre requisições (ms). */
export const REQUEST_DELAY_MS = Number(process.env.SCRAPE_DELAY_MS ?? 400);

/** Número máximo de tentativas por URL. */
export const MAX_RETRIES = Number(process.env.SCRAPE_RETRIES ?? 4);

/** Requisições simultâneas (o limite real também é aplicado pelo front da wiki). */
export const CONCURRENCY = Number(process.env.SCRAPE_CONCURRENCY ?? 3);

/** Usa o navegador com janela visível para resolver o desafio Cloudflare. */
export const HEADLESS = process.env.SCRAPE_HEADLESS === '1';

/** Caminho explícito do Chrome, opcional. */
const CHROME_PATH_ENV = process.env.CHROME_PATH;

const DEFAULT_CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

export function resolveChromePath(): string | null {
  if (CHROME_PATH_ENV) return CHROME_PATH_ENV;
  for (const candidate of DEFAULT_CHROME_PATHS) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** User-Agent usado tanto no navegador quanto nas requisições HTTP. */
export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';