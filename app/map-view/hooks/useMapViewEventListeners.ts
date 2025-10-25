import { PlayerAction } from '@/app/hooks/websockets.types';
import { AppSnapshot, Character } from '@/app/map/types';
import React, { useEffect } from 'react';

const useMapViewEventListeners = (
  setGameState: React.Dispatch<React.SetStateAction<AppSnapshot>>
) => {
  // PLAYER ACTION
  useEffect(() => {
    const onPlayerAction: EventListener = (e: Event) => {
      const ev = e as CustomEvent<PlayerAction>;
      const { actionType } = ev.detail;
      if (actionType === 'updateHp') {
        const { newHp, characterId } = ev.detail;
        setGameState((prev) => ({
          ...prev,
          characters: prev.characters.map((character) =>
            character.id === characterId
              ? { ...character, hp: newHp as number }
              : character
          ),
        }));
      }

      if (actionType === 'addCondition') {
        const { characterId, condition } = ev.detail;
        setGameState((prev) => ({
          ...prev,
          characters: prev.characters.map((character: Character) => {
            if (character.id !== characterId) return character;
            const currentConditions = character.conditions || [];
            if (currentConditions.includes(condition as string))
              return character;
            return {
              ...character,
              conditions: [...currentConditions, condition as string],
            };
          }),
        }));
      }

      if (actionType === 'removeCondition') {
        const { characterId, condition } = ev.detail;
        setGameState((prev) => ({
          ...prev,
          characters: prev.characters.map((character: Character) => {
            if (character.id !== characterId) return character;
            const currentConditions = character.conditions || [];
            return {
              ...character,
              conditions: currentConditions.filter(
                (cond) => cond !== condition
              ),
            };
          }),
        }));
      }

      if (actionType === 'toggleStatus') {
        const { characterId, statusType, value } = ev.detail;
        setGameState((prev) => ({
          ...prev,
          characters: prev.characters.map((character: Character) => {
            if (character.id !== characterId) return character;

            if (statusType === 'advantage') {
              character.hasAdvantage = !!value;
            } else if (statusType === 'disadvantage') {
              character.hasDisadvantage = !!value;
            } else if (statusType === 'concentration') {
              character.concentrating = !!value;
            }
            return character;
          }),
        }));
      }
    };

    window.addEventListener('playerAction', onPlayerAction);

    return () => {
      window.removeEventListener('playerAction', onPlayerAction);
    };
  }, [setGameState]);

  // GAME UPDATE
  useEffect(() => {
    const onGameUpdate: EventListener = (e: Event) => {
      const ev = e as CustomEvent<AppSnapshot>;
      console.log('EVENT LISTENER: game update event:', ev);
      setGameState(ev.detail);
    };

    window.addEventListener('gameUpdate', onGameUpdate);

    return () => {
      window.removeEventListener('gameUpdate', onGameUpdate);
    };
  }, [setGameState]);
};

export default useMapViewEventListeners;
