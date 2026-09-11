import { useMemo } from 'react';
import type { Move, Pokemon } from '../types';
import {
  compatiblePokemonForMoves,
  movesForSelection,
  moveKey,
} from '../utils/compatibility';
import type { Indexes } from '../utils/compatibility';
import { Sprite } from './Sprite';

interface ResultPanelProps {
  indexes: Indexes;
  pokemon: Pokemon[];
  moves: Move[];
  onSelectPokemon: (pokemon: Pokemon) => void;
  onSelectMove: (move: Move) => void;
}

function moveLabel(move: Move): string {
  return move.type === 'TM' ? move.id : 'MT';
}

export function ResultPanel({
  indexes,
  pokemon,
  moves,
  onSelectPokemon,
  onSelectMove,
}: ResultPanelProps) {
  const selectedPokemonIds = useMemo(() => new Set(pokemon.map((p) => p.id)), [pokemon]);
  const selectedMoveKeys = useMemo(
    () => new Set(moves.map((m) => moveKey(m.type, m.id))),
    [moves],
  );

  const pokePool = useMemo(() => compatiblePokemonForMoves(indexes, moves), [indexes, moves]);
  const movePool = useMemo(
    () => movesForSelection(indexes, pokemon.map((p) => p.id)),
    [indexes, pokemon],
  );

  return (
    <section className="result-panel" aria-label="Resultados">
      <div className="result-columns">
        <div className="result-column">
          <h2 className="result-column-title">
            {moves.length > 0
              ? `Pokémons que aprendem ${moves.map(moveLabel).join(', ')}`
              : 'Pokémons'}
          </h2>
          {moves.length === 0 && (
            <p className="result-hint">
              Selecione um ou mais TMs/MTs para ver os Pokémon que os aprendem.
            </p>
          )}
          {moves.length > 0 && (
            <>
              <p className="result-subtitle">{pokePool.length} Pokémon compatíveis</p>
              {pokePool.length === 0 && (
                <p className="search-empty">
                  Nenhum Pokémon aprende todos os golpes selecionados.
                </p>
              )}
              <ul className="explorer-list">
                {pokePool.map((entry) => {
                  const isSelected = selectedPokemonIds.has(entry.id);
                  return (
                    <li key={entry.id} className="explorer-item">
                      <Sprite id={entry.id} name={entry.name} />
                      <span className="explorer-item-info">
                        <span className="pokemon-item-name">{entry.name}</span>
                        <span className="pokemon-item-meta">
                          #{String(entry.id).padStart(3, '0')} · Geração {entry.generation}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="explorer-add"
                        disabled={isSelected}
                        onClick={() => onSelectPokemon(entry)}
                      >
                        {isSelected ? '✓ Adicionado' : 'Adicionar'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className="result-column">
          <h2 className="result-column-title">
            {pokemon.length > 0
              ? `TMs/MTs compartilhados por ${pokemon.map((p) => p.name).join(', ')}`
              : 'TMs/MTs'}
          </h2>
          {pokemon.length === 0 && (
            <p className="result-hint">
              Selecione um ou mais Pokémon para ver os TMs/MTs que todos aprendem.
            </p>
          )}
          {pokemon.length > 0 && (
            <>
              <p className="result-subtitle">{movePool.length} TMs/MTs em comum</p>
              {movePool.length === 0 && (
                <p className="search-empty">
                  Os Pokémon selecionados não compartilham nenhum TM/MT.
                </p>
              )}
              <ul className="result-moves">
                {movePool.map((entry) => {
                  const key = moveKey(entry.type, entry.id);
                  const isSelected = selectedMoveKeys.has(key);
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        className="result-move"
                        disabled={isSelected}
                        onClick={() => onSelectMove(entry)}
                      >
                        <span className={`move-card-id ${entry.type === 'MT' ? 'badge-mt' : ''}`}>
                          {entry.type === 'TM' ? entry.id : 'MT'}
                        </span>
                        <span className="move-card-name">{entry.name}</span>
                        <span className="move-card-count">{entry.pokemonIds.length} Pokémon</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}