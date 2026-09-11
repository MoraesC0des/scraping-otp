import puppeteer from 'puppeteer-core';
import type { SessionCookies } from './cache.ts';
import {
  hasCached,
  readCached,
  writeCached,
  readSession,
  writeSession,
  clearSession,
  SESSION_TTL_MS,
} from './cache.ts';
import {
  WIKI_BASE,
  MAX_RETRIES,
  HEADLESS,
  resolveChromePath,
  BROWSER_USER_AGENT,
} from './config.ts';
import { sleep, createLogger } from './utils.ts';

const log = createLogger();

/** Detecta se a resposta é uma página de desafio do Cloudflare. */
export function isChallengePage(html: string): boolean {
  // Páginas reais da wiki sempre contêm .mw-parser-output; o desafio não.
  return html.includes('challenges.cloudflare.com') || !html.includes('mw-parser-output');
}

interface HttpResult {
  status: number;
  text: string;
}

async function httpGet(url: string, session: SessionCookies): Promise<HttpResult> {
  const cookieHeader = session.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  const res = await fetch(url, {
    headers: {
      'User-Agent': session.ua,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      Cookie: cookieHeader,
      'Upgrade-Insecure-Requests': '1',
    },
    redirect: 'follow',
  });
  return { status: res.status, text: await res.text() };
}

/**
 * Abre um navegador real para resolver o desafio Cloudflare (Turnstile).
 * Retorna a sessão (cookie cf_clearance) e a salva em cache local.
 */
export async function solveChallengeInBrowser(): Promise<SessionCookies> {
  const chromePath = resolveChromePath();
  if (!chromePath) {
    throw new Error(
      'Nenhum Chrome/Edge encontrado. Instale o Google Chrome ou defina CHROME_PATH.',
    );
  }

  log.info('abrindo navegador para resolver o desafio Cloudflare...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(BROWSER_USER_AGENT);
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`${WIKI_BASE}/Primeira_Gera%C3%A7%C3%A3o`, {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
    await page
      .waitForSelector('#mw-content-text', { timeout: 120_000 })
      .catch(() => undefined);
    const hasContent = Boolean(await page.$('#mw-content-text'));
    if (!hasContent) {
      log.error('o desafio não foi resolvido pelo navegador');
      throw new Error('Falha ao resolver o desafio Cloudflare.');
    }

    const cookies = (await page.cookies()).map((c) => ({ name: c.name, value: c.value }));
    if (!cookies.some((c) => c.name === 'cf_clearance')) {
      throw new Error('Cookie cf_clearance não foi emitido pelo Cloudflare.');
    }

    const session: SessionCookies = {
      cookies,
      ua: BROWSER_USER_AGENT,
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    writeSession(session);
    log.info('desafio resolvido, sessão salva em cache.');
    return session;
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/**
 * Busca o HTML de uma URL. Usa cache local, cookies de sessão e replay
 * do desafio caso o Cloudflare volte a bloquear.
 */
export async function fetchHtml(url: string, opts: { useCache?: boolean } = {}): Promise<string> {
  const useCache = opts.useCache ?? true;

  if (useCache && hasCached(url)) {
    const cached = readCached(url);
    if (cached) return cached;
  }

  let session: SessionCookies | null = readSession();

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    if (!session) session = await solveChallengeInBrowser();

    let result: HttpResult;
    try {
      result = await httpGet(url, session);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      log.error(`falha de rede em ${url} (tentativa ${attempt + 1}): ${lastError.message}`);
      await sleep(1000 + attempt * 750);
      continue;
    }

    if (isChallengePage(result.text)) {
      log.warn(`Cloudflare bloqueou ${url}, renovando sessão...`);
      session = await solveChallengeInBrowser();
      continue;
    }

    if (result.status === 200 || result.status === 404) {
      if (useCache) writeCached(url, result.text);
      return result.text;
    }

    log.error(
      `status ${result.status} para ${url} (tentativa ${attempt + 1}), tentando novamente...`,
    );
    await sleep(1000 + attempt * 750);
  }

  throw lastError ?? new Error(`Falha ao buscar ${url} após ${MAX_RETRIES} tentativas.`);
}

export { clearSession };