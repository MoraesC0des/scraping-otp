import type { Move, Pokemon } from '../types';
import { moveKey } from '../utils/compatibility';

interface SelectionBarProps {
  pokemon: Pokemon[];
  moves: Move[];
  onRemovePokemon: (id: number) => void;
  onRemoveMove: (key: string) => void;
}

export function SelectionBar({ pokemon, moves, onRemovePokemon, onRemoveMove }: SelectionBarProps) {
  if (pokemon.length === 0 && moves.length === 0) {
    return (
      <p className="selection-hint">
        Adicione Pokémon e/ou TMs/MTs na busca acima para cruzar as informações.
      </p>
    );
  }

  return (
    <div className="selected-pokemon">
      {pokemon.map((mon) => (
        <span key={mon.id} className="chip">
          {mon.name}
          <span className="chip-idx">#{String(mon.id).padStart(3, '0')}</span>
          <button
            type="button"
            aria-label={`Remover ${mon.name}`}
            onClick={() => onRemovePokemon(mon.id)}
          >
            ×
          </button>
        </span>
      ))}
      {moves.map((move) => {
        const key = moveKey(move.type, move.id);
        return (
          <span key={key} className="chip">
            {move.type === 'TM' ? `${move.id} · ` : 'MT · '}
            {move.name}
            <button
              type="button"
              aria-label={`Remover ${move.name}`}
              onClick={() => onRemoveMove(key)}
            >
              ×
            </button>
          </span>
        );
      })}
    </div>
  );
}