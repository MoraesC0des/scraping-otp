import { useEffect, useMemo, useState } from 'react';
import type { Dataset, Move, Pokemon } from '../types';
import { pokemonMatchesQuery } from '../utils/compatibility';
import { comparePokemon } from '../utils/stats';
import type { SortCriterion } from '../utils/stats';
import { StoreToolbar } from '../components/StoreToolbar';
import { PokemonStoreCard } from '../components/PokemonStoreCard';
import type { Selection } from '../hooks/useSelection';

interface StoreProps {
  dataset: Dataset;
  selection: Selection;
}

const PAGE_SIZE = 90;

export function Store({ dataset, selection }: StoreProps) {
  const [query, setQuery] = useState('');
  const [generation, setGeneration] = useState<'all' | number>('all');
  const [moveFilters, setMoveFilters] = useState<Move[]>([]);
  const [abilityFilters, setAbilityFilters] = useState<string[]>([]);
  const [criteria, setCriteria] = useState<SortCriterion[]>([{ key: 'id', dir: 'asc' }]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    let list: Pokemon[] = dataset.pokemon.filter((p) => pokemonMatchesQuery(p, query));

    if (generation !== 'all') {
      list = list.filter((p) => p.generation === generation);
    }

    if (moveFilters.length > 0) {
      list = list.filter((p) => moveFilters.every((m) => m.pokemonIds.includes(p.id)));
    }

    if (abilityFilters.length > 0) {
      list = list.filter((p) => abilityFilters.every((a) => p.abilities.includes(a)));
    }

    return [...list].sort((a, b) => comparePokemon(a, b, criteria));
  }, [dataset.pokemon, query, generation, moveFilters, abilityFilters, criteria]);

  const selectedIds = useMemo(
    () => new Set(selection.selectedPokemon.map((p) => p.id)),
    [selection.selectedPokemon],
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, generation, moveFilters, abilityFilters, criteria]);

  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;
  const activeAbilityCount = abilityFilters.length;

  return (
    <section className="store" aria-label="Loja de Pokémon">
      <StoreToolbar
        dataset={dataset}
        query={query}
        onQueryChange={setQuery}
        generation={generation}
        onGenerationChange={setGeneration}
        selectedMoves={moveFilters}
        onMovesChange={setMoveFilters}
        selectedAbilities={abilityFilters}
        onAbilitiesChange={setAbilityFilters}
        criteria={criteria}
        onCriteriaChange={setCriteria}
      />

      <p className="store-count" role="status">
        {filtered.length} Pokémon
        {moveFilters.length > 0 && (
          <span className="store-count-filters"> · moves: {moveFilters.map((m) => (m.type === 'TM' ? m.id : 'MT')).join(' + ')}</span>
        )}
        {activeAbilityCount > 0 && (
          <span className="store-count-filters"> · habilidades: {abilityFilters.join(' + ')}</span>
        )}
      </p>

      {visible.length === 0 ? (
        <p className="search-empty">
          Nenhum Pokémon encontrado com os filtros atuais.
        </p>
      ) : (
        <>
          <ul className="store-grid">
            {visible.map((pokemon) => (
              <li key={pokemon.id}>
                <PokemonStoreCard
                  pokemon={pokemon}
                  selected={selectedIds.has(pokemon.id)}
                  onAdd={selection.selectPokemon}
                />
              </li>
            ))}
          </ul>

          {remaining > 0 && (
            <button
              type="button"
              className="store-load-more"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              Carregar mais ({remaining} restantes)
            </button>
          )}
        </>
      )}
    </section>
  );
}