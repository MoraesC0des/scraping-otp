import { useMemo } from 'react';
import type { Dataset, Move, Pokemon } from '../types';
import { searchMoves, searchPokemonList } from '../utils/compatibility';

interface CombinedSearchProps {
  dataset: Dataset;
  query: string;
  onQueryChange: (query: string) => void;
  onSelectPokemon: (pokemon: Pokemon) => void;
  onSelectMove: (move: Move) => void;
}

export function CombinedSearch({
  dataset,
  query,
  onQueryChange,
  onSelectPokemon,
  onSelectMove,
}: CombinedSearchProps) {
  const pokemonResults = useMemo(
    () => searchPokemonList(dataset.pokemon, query, 6),
    [dataset.pokemon, query],
  );
  const moveResults = useMemo(
    () => searchMoves(dataset.moves, query).slice(0, 6),
    [dataset.moves, query],
  );
  const hasQuery = query.trim() !== '';

  return (
    <div className="pokemon-selector">
      <label className="search-field" htmlFor="combined-search">
        <span aria-hidden="true">🔎</span>
        <input
          id="combined-search"
          type="search"
          placeholder="Buscar Pokémon ou TM/MT..."
          value={query}
          autoComplete="off"
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {hasQuery && (
          <button
            type="button"
            className="clear-input"
            aria-label="Limpar busca"
            onClick={() => onQueryChange('')}
          >
            ×
          </button>
        )}
      </label>

      {hasQuery && (
        <ul className="search-results combined-results" role="listbox" aria-label="Resultados da busca">
          {pokemonResults.length === 0 && moveResults.length === 0 && (
            <li className="search-empty">Nenhum Pokémon ou TM/MT encontrado.</li>
          )}

          {pokemonResults.length > 0 && (
            <li className="search-group-label" aria-hidden="true">
              Pokémon
            </li>
          )}
          {pokemonResults.map((pokemon) => (
            <li key={`p-${pokemon.id}`}>
              <button type="button" onClick={() => onSelectPokemon(pokemon)}>
                <span className="pokemon-item-name">{pokemon.name}</span>
                <span className="pokemon-item-meta">
                  Pokémon · #{String(pokemon.id).padStart(3, '0')}
                </span>
              </button>
            </li>
          ))}

          {moveResults.length > 0 && (
            <li className="search-group-label" aria-hidden="true">
              TMs/MTs
            </li>
          )}
          {moveResults.map((move) => (
            <li key={`m-${move.type}-${move.id}`}>
              <button type="button" onClick={() => onSelectMove(move)}>
                <span className="pokemon-item-name">
                  {move.type === 'TM' ? `${move.id} · ${move.name}` : `MT · ${move.name}`}
                </span>
                <span className="pokemon-item-meta">{move.pokemonIds.length} Pokémon</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}