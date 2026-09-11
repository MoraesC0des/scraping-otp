import { WIKI_BASE } from './config.ts';

/** Pequena espera. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Executa N promessas com limite de concorrência, preservando a ordem. */
export async function mapConcurrent<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/** Log de progresso único (sem duplicar linhas sob concorrência). */
export function createLogger(): {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
} {
  const info = (msg: string): void => console.log(`[info]  ${msg}`);
  const warn = (msg: string): void => console.warn(`[warn]  ${msg}`);
  const error = (msg: string): void => console.error(`[error] ${msg}`);
  return { info, warn, error };
}

/** Converte um slug da wiki em URL absoluta, preservando codificação. */
export function pageUrl(slug: string): string {
  const hasUtf8 = slug.includes('%');
  const encoded = hasUtf8 ? slug : slug.split('/').map(encodeURIComponent).join('/');
  return `${WIKI_BASE}/${encoded}`;
}

/** Extrai o slug de um href da wiki ("/Bulbasaur" -> "Bulbasaur"). */
export function slugFromHref(href: string | undefined): string | null {
  if (!href) return null;
  const clean = href
    .split('?')[0]
    .replace(/^\/+/, '')
    .trim();
  return clean || null;
}

/** Tenta ordenar um número de geração a partir da ordem das páginas. */