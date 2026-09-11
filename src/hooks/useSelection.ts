import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dataset, Move, Pokemon } from '../types';
import { buildIndexes, moveKey, pokemonLearnsAll } from '../utils/compatibility';
import type { Indexes } from '../utils/compatibility';
import { applySelectionToUrl, selectionFromUrl } from '../utils/urlState';

export interface Selection {
  indexes: Indexes;
  selectedPokemon: Pokemon[];
  selectedMoves: Move[];
  notice: string | null;
  selectPokemon: (pokemon: Pokemon) => void;
  selectMove: (move: Move) => void;
  removePokemon: (id: number) => void;
  removeMove: (key: string) => void;
  showNotice: (message: string) => void;
}

/**
 * Seleção compartilhada entre as páginas (Finder e Loja): Pokémon + TMs/MTs,
 * com as regras de compatibilidade, avisos e sincronização de URL.
 */
export function useSelection(dataset: Dataset): Selection {
  const indexes = useMemo(() => buildIndexes(dataset), [dataset]);

  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon[]>([]);
  const [selectedMoves, setSelectedMoves] = useState<Move[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const url = selectionFromUrl(window.location.search, indexes);
    setSelectedPokemon(
      url.pokemonIds
        .map((id) => indexes.pokemonById.get(id))
        .filter((p): p is Pokemon => Boolean(p)),
    );
    setSelectedMoves(
      url.moveKeys
        .map((key) => indexes.moveByKey.get(key))
        .filter((m): m is Move => Boolean(m)),
    );
  }, [indexes]);

  useEffect(() => {
    applySelectionToUrl(
      selectedPokemon.map((p) => p.id),
      selectedMoves,
      indexes,
    );
  }, [selectedPokemon, selectedMoves, indexes]);

  const showNotice = useCallback((message: string): void => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  }, []);

  const selectPokemon = useCallback(
    (pokemon: Pokemon): void => {
      if (selectedPokemon.some((p) => p.id === pokemon.id)) return;
      if (selectedMoves.length > 0 && !pokemonLearnsAll(pokemon.id, selectedMoves)) {
        showNotice(`${pokemon.name} não aprende todos os TMs/MTs selecionados.`);
        return;
      }
      setSelectedPokemon((prev) => [...prev, pokemon]);
    },
    [selectedPokemon, selectedMoves, showNotice],
  );

  const selectMove = useCallback(
    (move: Move): void => {
      if (selectedMoves.some((m) => m.type === move.type && m.id === move.id)) return;
      if (selectedPokemon.length > 0 && !selectedPokemon.every((p) => pokemonLearnsAll(p.id, [move]))) {
        showNotice(
          `${move.type === 'TM' ? move.id : 'MT'} · ${move.name} não é aprendido por todos os Pokémon selecionados.`,
        );
        return;
      }
      setSelectedMoves((prev) => [...prev, move]);
    },
    [selectedPokemon, selectedMoves, showNotice],
  );

  const removePokemon = useCallback((id: number): void => {
    setSelectedPokemon((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const removeMove = useCallback((key: string): void => {
    setSelectedMoves((prev) => prev.filter((m) => moveKey(m.type, m.id) !== key));
  }, []);

  return {
    indexes,
    selectedPokemon,
    selectedMoves,
    notice,
    selectPokemon,
    selectMove,
    removePokemon,
    removeMove,
    showNotice,
  };
}