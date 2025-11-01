import { PlayerAction } from '@/app/hooks/websockets.types';
import { AppSnapshot, Character, DamageEvent } from '@/app/map/types';
import React, { useEffect } from 'react';

interface MapViewEventListenersProps {
  setGameState: React.Dispatch<React.SetStateAction<AppSnapshot>>;
  handleRemoteCharacterMove: (
    characterId: string,
    position: { x: number; y: number }
  ) => void;
  handleRemoteDamageLog: (damageLog: DamageEvent) => void;
}

const useMapViewEventListeners = ({
  setGameState,
  handleRemoteCharacterMove,
  handleRemoteDamageLog,
}: MapViewEventListenersProps) => {
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

  useEffect(() => {
    const onMoveCharacter: EventListener = (e: Event) => {
      const ev = e as CustomEvent<any>;
      console.log('Received move character event:', ev.detail);
      const { characterId, position } = ev.detail;
      handleRemoteCharacterMove(characterId, position);
    };

    window.addEventListener('moveCharacter', onMoveCharacter);

    return () => {
      window.removeEventListener('moveCharacter', onMoveCharacter);
    };
  }, [handleRemoteCharacterMove]);

  // DAMAGE LOG
  useEffect(() => {
    const onDamageLog: EventListener = (e: Event) => {
      const ev = e as CustomEvent<DamageEvent>;
      console.log('Received damage log event:', ev.detail);
      handleRemoteDamageLog(ev.detail);
      // Handle damage log as needed
    };

    window.addEventListener('damageLog', onDamageLog);

    return () => {
      window.removeEventListener('damageLog', onDamageLog);
    };
  }, [handleRemoteDamageLog]);
};

export default useMapViewEventListeners;
