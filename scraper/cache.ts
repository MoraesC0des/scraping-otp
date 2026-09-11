import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { CACHE_DIR } from './config.ts';

function cacheDir(): string {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  return CACHE_DIR;
}

function fileNameForUrl(url: string): string {
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 20);
  return `${hash}.html`;
}

export function hasCached(url: string): boolean {
  return fs.existsSync(path.join(cacheDir(), fileNameForUrl(url)));
}

export function readCached(url: string): string | null {
  const file = path.join(cacheDir(), fileNameForUrl(url));
  if (!fs.existsSync(file)) return null;
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

export function writeCached(url: string, html: string): void {
  const file = path.join(cacheDir(), fileNameForUrl(url));
  fs.writeFileSync(file, html, 'utf8');
}

export function clearCache(): void {
  fs.rmSync(cacheDir(), { recursive: true, force: true });
}

/* ------------------------------------------------------------------ */
/* Cookies de sessão (cf_clearance) persistidos entre execuções        */
/* ------------------------------------------------------------------ */

export interface SessionCookies {
  cookies: Array<{ name: string; value: string }>;
  ua: string;
  /** timestamp de expiração estimado (ms). */
  expiresAt: number;
}

function cookiesPath(): string {
  return path.join(cacheDir(), 'session.json');
}

const SESSION_TTL_MS = 20 * 60 * 1000;

export function readSession(): SessionCookies | null {
  const file = cookiesPath();
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as SessionCookies;
    if (Date.now() > parsed.expiresAt || !parsed.cookies.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(cookies: SessionCookies): void {
  fs.writeFileSync(cookiesPath(), JSON.stringify(cookies), 'utf8');
}

export function clearSession(): void {
  const file = cookiesPath();
  if (fs.existsSync(file)) fs.rmSync(file, { force: true });
}

export { SESSION_TTL_MS };