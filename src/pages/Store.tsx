import { useEffect, useMemo, useState } from 'react';
import type { Dataset, Move, Pokemon } from '../types';
import { pokemonMatchesQuery } from '../utils/compatibility';
import { comparePokemon } from '../utils/stats';
import type { SortCriterion } from '../utils/stats';
import { StoreToolbar } from '../components/StoreToolbar';
import { PokemonStoreCard } from '../components/PokemonStoreCard';
import type { Selection } from '../hooks/useSelection';
import { trackFilterUsed, trackPokemonClicked } from '../analytics';

interface StoreProps {
  dataset: Dataset;
  selection: Selection;
}

const PAGE_SIZE = 90;

function computeFiltered(
  pokemon: Pokemon[],
  query: string,
  generation: 'all' | number,
  moves: Move[],
  abilities: string[],
  criteria: SortCriterion[],
): Pokemon[] {
  let list: Pokemon[] = pokemon.filter((p) => pokemonMatchesQuery(p, query));

  if (generation !== 'all') {
    list = list.filter((p) => p.generation === generation);
  }

  if (moves.length > 0) {
    list = list.filter((p) => moves.every((m) => m.pokemonIds.includes(p.id)));
  }

  if (abilities.length > 0) {
    list = list.filter((p) => abilities.every((a) => p.abilities.includes(a)));
  }

  return [...list].sort((a, b) => comparePokemon(a, b, criteria));
}

export function Store({ dataset, selection }: StoreProps) {
  const [query, setQuery] = useState('');
  const [generation, setGeneration] = useState<'all' | number>('all');
  const [moveFilters, setMoveFilters] = useState<Move[]>([]);
  const [abilityFilters, setAbilityFilters] = useState<string[]>([]);
  const [criteria, setCriteria] = useState<SortCriterion[]>([{ key: 'id', dir: 'asc' }]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(
    () => computeFiltered(dataset.pokemon, query, generation, moveFilters, abilityFilters, criteria),
    [dataset.pokemon, query, generation, moveFilters, abilityFilters, criteria],
  );

  const handleMoveFiltersChange = (moves: Move[]): void => {
    const resultCount = computeFiltered(
      dataset.pokemon,
      query,
      generation,
      moves,
      abilityFilters,
      criteria,
    ).length;
    setMoveFilters(moves);
    const tm = moves.map((m) => m.id).join(', ');
    void trackFilterUsed({ tm, resultCount });
  };

  const handleAbilityFiltersChange = (abilities: string[]): void => {
    const resultCount = computeFiltered(
      dataset.pokemon,
      query,
      generation,
      moveFilters,
      abilities,
      criteria,
    ).length;
    setAbilityFilters(abilities);
    const ability = abilities.join(', ');
    const tm = moveFilters.map((m) => m.id).join(', ');
    void trackFilterUsed({ tm, ability, resultCount });
  };

  const handleAddPokemon = (pokemon: Pokemon): void => {
    void trackPokemonClicked(pokemon.name);
    selection.selectPokemon(pokemon);
  };

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
        onMovesChange={handleMoveFiltersChange}
        selectedAbilities={abilityFilters}
        onAbilitiesChange={handleAbilityFiltersChange}
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
                  onAdd={handleAddPokemon}
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