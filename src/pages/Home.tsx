import { useState } from 'react';
import type { Move, Pokemon } from '../types';
import { CombinedSearch } from '../components/CombinedSearch';
import { SelectionBar } from '../components/SelectionBar';
import { ResultPanel } from '../components/ResultPanel';
import type { Selection } from '../hooks/useSelection';

interface HomeProps {
  dataset: Parameters<typeof CombinedSearch>[0]['dataset'];
  selection: Selection;
}

export function Home({ dataset, selection }: HomeProps) {
  const [pokemonQuery, setPokemonQuery] = useState('');

  const handleSelectPokemon = (pokemon: Pokemon): void => {
    selection.selectPokemon(pokemon);
    setPokemonQuery('');
  };

  const handleSelectMove = (move: Move): void => {
    selection.selectMove(move);
    setPokemonQuery('');
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