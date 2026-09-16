import { initializeApp } from 'firebase/app';
import type { Analytics } from 'firebase/analytics';

export interface AnalyticsParams {
  [paramName: string]: string | number | boolean;
}

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
      return module.getAnalytics(app);
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

let appOpenTracked = false;

/** `app_open`: registra uma única vez por carregamento de página/module. */
export function trackAppOpen(): Promise<void> {
  if (appOpenTracked) return Promise.resolve();
  appOpenTracked = true;
  return trackEvent('app_open');
}

/** `filter_used`: tm/ability são omitidos quando não existem. */
export function trackFilterUsed(params: {
  tm?: string;
  ability?: string;
  resultCount: number;
}): Promise<void> {
  const eventParams: AnalyticsParams = {};
  if (params.tm) eventParams.tm = params.tm;
  if (params.ability) eventParams.ability = params.ability;
  eventParams.result_count = params.resultCount;
  return trackEvent('filter_used', eventParams);
}

/** `pokemon_clicked`: registra cliques/seleção de um Pokémon nos resultados. */
export function trackPokemonClicked(pokemonName: string): Promise<void> {
  return trackEvent('pokemon_clicked', { pokemon_name: pokemonName });
}