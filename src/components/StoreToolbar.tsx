import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dataset, Move } from '../types';
import { moveKey, searchMoves } from '../utils/compatibility';
import { abilityOptions } from '../utils/abilities';
import { trackTmSearch } from '../analytics';
import {
  STAT_OPTIONS,
  nextCriterion,
} from '../utils/stats';
import type { SortCriterion, StatKey } from '../utils/stats';

interface StoreToolbarProps {
  dataset: Dataset;
  selectedMoves: Move[];
  onMovesChange: (moves: Move[]) => void;
  selectedAbilities: string[];
  onAbilitiesChange: (abilities: string[]) => void;
  criteria: SortCriterion[];
  onCriteriaChange: (criteria: SortCriterion[]) => void;
}

function moveDisplay(move: Move): string {
  return move.type === 'TM' ? `${move.id} · ${move.name}` : `MT · ${move.name}`;
}

export function StoreToolbar({
  dataset,
  selectedMoves,
  onMovesChange,
  selectedAbilities,
  onAbilitiesChange,
  criteria,
  onCriteriaChange,
}: StoreToolbarProps) {
  const [moveQuery, setMoveQuery] = useState('');
  const lastTrackedQuery = useRef('');

  const abilities = useMemo(() => abilityOptions(dataset), [dataset]);

  useEffect(() => {
    const q = moveQuery.trim();
    if (!q) {
      lastTrackedQuery.current = '';
      return;
    }
    const timer = setTimeout(() => {
      if (q === lastTrackedQuery.current) return;
      lastTrackedQuery.current = q;
      void trackTmSearch({ query: q, resultCount: searchMoves(dataset.moves, q).length });
    }, 250);
    return () => clearTimeout(timer);
  }, [moveQuery, dataset.moves]);

  const toggleAbility = (ability: string): void => {
    if (selectedAbilities.includes(ability)) {
      onAbilitiesChange(selectedAbilities.filter((a) => a !== ability));
    } else {
      onAbilitiesChange([...selectedAbilities, ability]);
    }
  };

  const moveResults = useMemo(() => {
    const q = moveQuery.trim();
    if (!q) return [];
    const already = new Set(selectedMoves.map((m) => moveKey(m.type, m.id)));
    return searchMoves(dataset.moves, q)
      .filter((m) => !already.has(moveKey(m.type, m.id)))
      .slice(0, 6);
  }, [dataset.moves, moveQuery, selectedMoves]);

  const addMove = (move: Move): void => {
    onMovesChange([...selectedMoves, move]);
    setMoveQuery('');
  };

  const removeMove = (key: string): void => {
    onMovesChange(selectedMoves.filter((m) => moveKey(m.type, m.id) !== key));
  };

  const updateCriterion = (index: number, patch: Partial<SortCriterion>): void => {
    onCriteriaChange(
      criteria.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
  };

  const removeCriterion = (index: number): void => {
    onCriteriaChange(criteria.filter((_, i) => i !== index));
  };

  const addCriterion = (): void => {
    onCriteriaChange([...criteria, nextCriterion(criteria)]);
  };

  return (
    <div className="store-toolbar">
      <div className="store-filter store-filter-move">
        <span className="store-filter-label">TMs/MTs</span>
        <div className="move-multi">
          <div className="move-multi-search">
            <input
              type="search"
              placeholder="Buscar TM/MT para filtrar..."
              value={moveQuery}
              autoComplete="off"
              onChange={(event) => setMoveQuery(event.target.value)}
            />
            {moveResults.length > 0 && (
              <ul className="search-results move-results" role="listbox" aria-label="TMs/MTs para filtrar">
                {moveResults.map((move) => {
                  const key = moveKey(move.type, move.id);
                  return (
                    <li key={key}>
                      <button type="button" onClick={() => addMove(move)}>
                        <span className="pokemon-item-name">{moveDisplay(move)}</span>
                        <span className="pokemon-item-meta">
                          {move.pokemonIds.length} Pokémon
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {selectedMoves.length > 0 && (
            <div className="move-multi-chips">
              {selectedMoves.map((move) => {
                const key = moveKey(move.type, move.id);
                return (
                  <span key={key} className="chip">
                    {moveDisplay(move)}
                    <button
                      type="button"
                      aria-label={`Remover ${move.name}`}
                      onClick={() => removeMove(key)}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <fieldset className="store-filter ability-filter">
        <legend className="store-filter-label">Habilidades</legend>
        <div className="ability-chips">
          {abilities.map((ability) => {
            const active = selectedAbilities.includes(ability);
            return (
              <button
                key={ability}
                type="button"
                className={active ? 'ability-chip ability-chip-active' : 'ability-chip'}
                aria-pressed={active}
                onClick={() => toggleAbility(ability)}
              >
                {active ? '✓ ' : ''}{ability}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="sort-builder">
        <span className="sort-builder-title">Ordem de prioridade</span>
        <div className="sort-builder-rows">
          {criteria.map((criterion, index) => (
            <div key={index} className="sort-row">
              <select
                aria-label="Estatística"
                value={criterion.key}
                onChange={(event) =>
                  updateCriterion(index, { key: event.target.value as StatKey })
                }
              >
                {STAT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="sort-dir"
                aria-label="Inverter direção"
                title={criterion.dir === 'asc' ? 'Crescente' : 'Decrescente'}
                onClick={() =>
                  updateCriterion(index, {
                    dir: criterion.dir === 'asc' ? 'desc' : 'asc',
                  })
                }
              >
                {criterion.dir === 'asc' ? '↑' : '↓'}
              </button>
              <button
                type="button"
                className="sort-remove"
                aria-label="Remover critério"
                disabled={criteria.length <= 1}
                onClick={() => removeCriterion(index)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="sort-add" onClick={addCriterion}>
          + Adicionar critério
        </button>
      </div>
    </div>
  );
}