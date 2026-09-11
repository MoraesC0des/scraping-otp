import type { Dataset, Move, Pokemon } from './types';
import pokemonJson from '../data/pokemon.json';
import movesJson from '../data/moves.json';

const rawPokemon = pokemonJson as unknown as { pokemon: Pokemon[] };
const rawMoves = movesJson as unknown as { moves: Move[] };

/** Carrega os JSONs locais gerados pelo scraper. */
export function loadDataset(): Dataset {
  return {
    pokemon: rawPokemon.pokemon,
    moves: rawMoves.moves,
  };
}