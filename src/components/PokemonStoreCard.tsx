import { memo } from 'react';
import type { Pokemon } from '../types';
import { STAT_OPTIONS, statValue } from '../utils/stats';
import type { StatKey } from '../utils/stats';
import { Sprite } from './Sprite';

interface PokemonStoreCardProps {
  pokemon: Pokemon;
  selected: boolean;
  onAdd: (pokemon: Pokemon) => void;
}

const STAT_ROWS = STAT_OPTIONS.filter(
  (option) => option.key !== 'id' && option.key !== 'total',
);

function StatBar({ statKey, pokemon }: { statKey: StatKey; pokemon: Pokemon }) {
  const meta = STAT_OPTIONS.find((option) => option.key === statKey);
  const value = statValue(pokemon, statKey);
  const percent = value == null ? 0 : Math.min(100, (value / (meta?.max ?? 8)) * 100);
  const pctText = `${Math.round(percent)}%`;

  return (
    <div className="store-stat" title={meta ? `${meta.label}: ${value ?? '—'}` : undefined}>
      <span className="store-stat-name">{meta?.label ?? statKey}</span>
      <span className="store-stat-track">
        <span
          className="store-stat-fill"
          style={{ width: pctText }}
          aria-hidden="true"
        />
      </span>
      <span className="store-stat-value">{value == null ? '—' : value}</span>
    </div>
  );
}

export const PokemonStoreCard = memo(function PokemonStoreCard({ pokemon, selected, onAdd }: PokemonStoreCardProps) {
  const total = statValue(pokemon, 'total');

  return (
    <article className={`store-card${selected ? ' store-card-selected' : ''}`}>
      <button
        type="button"
        className="store-card-add"
        disabled={selected}
        onClick={() => onAdd(pokemon)}
        aria-pressed={selected}
      >
        {selected ? '✓ Adicionado' : 'Adicionar'}
      </button>

      <div className="store-card-head">
        <Sprite id={pokemon.id} name={pokemon.name} />
        <div className="store-card-id">
          #{String(pokemon.id).padStart(3, '0')}
          <span>Geração {pokemon.generation}</span>
        </div>
      </div>

      <h3 className="store-card-name">{pokemon.name}</h3>

      {pokemon.abilities.length > 0 && (
        <div className="store-card-abilities">
          {pokemon.abilities.map((ability) => (
            <span key={ability} className="ability-badge">
              {ability}
            </span>
          ))}
        </div>
      )}

      <div className="store-stats">
        {STAT_ROWS.map((option) => (
          <StatBar key={option.key} statKey={option.key} pokemon={pokemon} />
        ))}
      </div>

      <div className="store-total">
        <span>Total</span>
        <strong>{total == null ? '—' : total}</strong>
      </div>
    </article>
  );
});