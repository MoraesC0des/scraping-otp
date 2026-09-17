import { initializeApp } from 'firebase/app';
import type { Analytics } from 'firebase/analytics';

export interface AnalyticsParams {
  [paramName: string]: string | number | boolean;
}

export type FilterAction = 'added' | 'removed';

/**
 * Camada de Analytics do Firebase. Toda a inicialização vive aqui, isolada dos
 * componentes. O Firebase só é carregado em navegadores, de forma assíncrona e
 * com fallback silencioso: se as variáveis de ambiente não existirem, se o
 * Analytics não for suportado ou se qualquer chamada falhar, o app nunca
 * quebra por causa disso.
 */

type FirebaseConfig = Record<string, string>;

function firebaseConfigFromEnv(): FirebaseConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;
  const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined;

  if (!apiKey || !projectId || !appId) return null;

  const config: FirebaseConfig = { apiKey, projectId, appId };
  if (authDomain) config.authDomain = authDomain;
  if (measurementId) config.measurementId = measurementId;
  return config;
}

/**
 * Decide se o Analytics deve rodar em "debug mode".
 *
 * DebugView (firebase.google.com/docs/analytics/debugview) só exibe eventos
 * quando o debug mode está ativo: sem ele, os eventos seguem o processamento
 * normal e levam 24-48h para aparecer nos relatórios — e NÃO aparecem no
 * DebugView. Por isso o debug é ligado apenas quando: (a) rodando `vite dev`
 * (import.meta.env.DEV), (b) `VITE_FIREBASE_DEBUG_MODE=1`, ou (c) a URL tem
 * `?debug_mode=1`. Em produção/build normal permanece desligado para não
 * direcionar o tráfego real para o DebugView.
 */
function debugModeRequested(): boolean {
  if (import.meta.env.DEV) return true;
  if (import.meta.env.VITE_FIREBASE_DEBUG_MODE === '1') return true;
  if (typeof window !== 'undefined') {
    const search = new URLSearchParams(window.location.search);
    if (search.has('debug_mode')) return true;
  }
  return false;
}

let analyticsPromise: Promise<Analytics | null> | null = null;

function initAnalytics(): Promise<Analytics | null> {
  if (analyticsPromise) return analyticsPromise;

  analyticsPromise = (async () => {
    try {
      const config = firebaseConfigFromEnv();
      if (!config) return null;

      const module = await import('firebase/analytics');
      const supported = await module.isSupported();
      if (!supported) return null;

      const app = initializeApp(config);
      const analytics = module.getAnalytics(app);

      if (debugModeRequested()) {
        // gtag entende debug_mode como parâmetro de evento; aplicado como
        // parâmetro padrão, ativa o DebugView para todos os eventos desta página.
        module.setDefaultEventParameters({ debug_mode: true });
      }

      return analytics;
    } catch {
      return null;
    }
  })();

  return analyticsPromise;
}

export async function trackEvent(
  eventName: string,
  params?: AnalyticsParams,
): Promise<void> {
  try {
    const analytics = await initAnalytics();
    if (!analytics) return;

    const module = await import('firebase/analytics');
    module.logEvent(analytics, eventName, params);
  } catch {
    // Analytics é opcional: ignora qualquer falha silenciosamente.
  }
}

/** Trunca valores de texto para o limite de 100 caracteres do GA4. */
function clip(value: string, max = 100): string {
  return value.length > max ? value.slice(0, max) : value;
}

let appOpenTracked = false;

/** `app_open`: registra uma única vez por carregamento de página/module. */
export function trackAppOpen(): Promise<void> {
  if (appOpenTracked) return Promise.resolve();
  appOpenTracked = true;
  return trackEvent('app_open');
}

/** `result_view`: impressão inicial dos resultados da Loja (1x por carregamento). */
export function trackResultView(params: {
  resultCount: number;
  activeFilters: number;
  sort: string;
}): Promise<void> {
  return trackEvent('result_view', {
    result_count: params.resultCount,
    active_filters: params.activeFilters,
    sort_key: clip(params.sort),
  });
}

/** `tm_search`: busca digitada no campo de TMs/MTs (debounce no chamador). */
export function trackTmSearch(params: {
  query: string;
  resultCount: number;
}): Promise<void> {
  return trackEvent('tm_search', {
    search_term: clip(params.query),
    result_count: params.resultCount,
  });
}

/** `tm_filter`: adicionar/remover um filtro de TM/MT na Loja. */
export function trackTmFilter(params: {
  tm: string;
  action: FilterAction;
  resultCount: number;
}): Promise<void> {
  return trackEvent('tm_filter', {
    tm: clip(params.tm),
    action: params.action,
    result_count: params.resultCount,
  });
}

/** `ability_filter`: ativar/desativar uma habilidade de campo na Loja. */
export function trackAbilityFilter(params: {
  ability: string;
  action: FilterAction;
  resultCount: number;
}): Promise<void> {
  return trackEvent('ability_filter', {
    ability: clip(params.ability),
    action: params.action,
    result_count: params.resultCount,
  });
}

/** `load_more`: carregar mais resultados na paginação da Loja. */
export function trackLoadMore(params: {
  offset: number;
  total: number;
}): Promise<void> {
  return trackEvent('load_more', {
    offset: params.offset,
    total: params.total,
  });
}