import { useState } from 'react';
import type { Move, Pokemon } from '../types';
import { CombinedSearch } from '../components/CombinedSearch';
import { SelectionBar } from '../components/SelectionBar';
import { ResultPanel } from '../components/ResultPanel';
import type { Selection } from '../hooks/useSelection';
import { compatiblePokemonForMoves, pokemonLearnsAll } from '../utils/compatibility';
import { trackFilterUsed, trackPokemonClicked } from '../analytics';

interface HomeProps {
  dataset: Parameters<typeof CombinedSearch>[0]['dataset'];
  selection: Selection;
}

export function Home({ dataset, selection }: HomeProps) {
  const [pokemonQuery, setPokemonQuery] = useState('');

  const handleSelectPokemon = (pokemon: Pokemon): void => {
    void trackPokemonClicked(pokemon.name);
    selection.selectPokemon(pokemon);
    setPokemonQuery('');
  };

  const handleSelectMove = (move: Move): void => {
    const alreadySelected = selection.selectedMoves.some(
      (m) => m.type === move.type && m.id === move.id,
    );
    if (alreadySelected) return;

    const applies = selection.selectedPokemon.every((p) => pokemonLearnsAll(p.id, [move]));
    selection.selectMove(move);
    setPokemonQuery('');

    if (applies) {
      const resultCount = compatiblePokemonForMoves(selection.indexes, [
        ...selection.selectedMoves,
        move,
      ]).length;
      void trackFilterUsed({ tm: move.id, resultCount });
    }
  };

  return (
    <>
      <CombinedSearch
        dataset={dataset}
        query={pokemonQuery}
        onQueryChange={setPokemonQuery}
        onSelectPokemon={handleSelectPokemon}
        onSelectMove={handleSelectMove}
      />

      <SelectionBar
        pokemon={selection.selectedPokemon}
        moves={selection.selectedMoves}
        onRemovePokemon={selection.removePokemon}
        onRemoveMove={selection.removeMove}
      />

      <ResultPanel
        indexes={selection.indexes}
        pokemon={selection.selectedPokemon}
        moves={selection.selectedMoves}
        onSelectPokemon={handleSelectPokemon}
        onSelectMove={handleSelectMove}
      />
    </>
  );
}