export interface GenerationInfo {
  number: number;
  title: string;
  /** Slug usado na URL da wiki (ex.: "Primeira_Geração"). */
  slug: string;
}

/** Referência a um Pokémon extraída de uma página de geração. */
export interface PokemonRef {
  name: string;
  /** Slug/path usado na URL da página individual (ex.: "Bulbasaur"). */
  slug: string;
  /** Número da Pokédex exibido na wiki ("#001"), quando presente. */
  dexNumber: string | null;
}

/** TM extraída da seção "TMs" de um Pokémon. */
export interface ParsedTM {
  /** Identificação original da wiki, ex.: "TM06". */
  id: string;
  /** Nome do golpe, ex.: "Toxic". */
  name: string;
}

export interface ParsedMT {
  /** A wiki identifica MTs apenas pelo nome do golpe (sem numeração MT). */
  name: string;
}

/** TMs e MTs aprendidos por um único Pokémon. */
export interface PokemonMoves {
  tms: ParsedTM[];
  mts: ParsedMT[];
}

/** Status base (multiplicadores) exibidos na seção "Status" da wiki. */
export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

/** Registro normalizado de um Pokémon. */
export interface PokemonRecord {
  id: number;
  name: string;
  generation: number;
  slug: string;
  stats: PokemonStats | null;
  /** Habilidades de campo (caixa "Habilidades" da wiki), ex.: "Surf", "Rock Smash". */
  abilities: string[];
}

export type MoveType = 'TM' | 'MT';

/** Registro normalizado de um golpe (TM ou MT) e os Pokémon compatíveis. */
export interface MoveRecord {
  id: string;
  name: string;
  type: MoveType;
  pokemonIds: number[];
}

export interface Dataset {
  pokemon: PokemonRecord[];
  moves: MoveRecord[];
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
}

export interface ValidationReport {
  generatedAt: string;
  summary: {
    pokemonCount: number;
    tmCount: number;
    mtCount: number;
    pokemonPagesFetched: number;
    pokemonPagesFailed: number;
    issues: number;
  };
  issues: ValidationIssue[];
}