/* Multiplicadores da seção "Status" da wiki. */
export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

export interface Pokemon {
  id: number;
  name: string;
  generation: number;
  slug: string;
  stats: PokemonStats | null;
  /** Habilidades de campo (ex.: "Surf", "Rock Smash"). */
  abilities: string[];
}

export type MoveType = 'TM' | 'MT';

export interface Move {
  id: string;
  name: string;
  type: MoveType;
  pokemonIds: number[];
}

export interface Dataset {
  pokemon: Pokemon[];
  moves: Move[];
}