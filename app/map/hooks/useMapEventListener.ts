import type {
  MoveCharacterData,
  PlayerAction,
} from '@/app/hooks/websockets.types';
import { useEffect } from 'react';
import type { CharacterStatus } from '../types';

interface MapEventListenersProps {
  handleRemoteCharacterMove: (data: MoveCharacterData) => void;
  handleRemoteHpUpdate: (characterId: string, newHp: number) => void;
  sendGameState: () => void;
  handleRemoteAddCondition: (characterId: string, condition: string) => void;
  handleRemoteRemoveCondition: (characterId: string, condition: string) => void;
  handleRemoteToggleStatus: (
    characterId: string,
    status: CharacterStatus,
    value: boolean
  ) => void;
}

const useMapEventListeners = ({
  handleRemoteCharacterMove,
  handleRemoteHpUpdate,
  sendGameState,
  handleRemoteAddCondition,
  handleRemoteRemoveCondition,
  handleRemoteToggleStatus,
}: MapEventListenersProps) => {
  useEffect(() => {
    const onMoveCharacter: EventListener = (e: Event) => {
      const ev = e as CustomEvent<MoveCharacterData>;
      console.log('Received move character event:', ev.detail);
      handleRemoteCharacterMove(ev.detail);
    };

    window.addEventListener('moveCharacter', onMoveCharacter);

    return () => {
      window.removeEventListener('moveCharacter', onMoveCharacter);
    };
  }, [handleRemoteCharacterMove]);

  // gameUpdate
  useEffect(() => {
    const onGameUpdate: EventListener = (e: Event) => {
      const ev = e as CustomEvent<unknown>;
      console.log('Received game update event:', ev.detail);
    };

    window.addEventListener('gameUpdate', onGameUpdate);

    return () => {
      window.removeEventListener('gameUpdate', onGameUpdate);
    };
  }, []);

  // playerAction
  useEffect(() => {
    const onPlayerAction: EventListener = (e: Event) => {
      const ev = e as CustomEvent<PlayerAction>;
      console.log('Received player action event:', ev.detail);

      const { actionType } = ev.detail;
      if (actionType === 'updateHp') {
        const { newHp, characterId } = ev.detail;
        handleRemoteHpUpdate(characterId, newHp as number);
      }

      if (actionType === 'addCondition') {
        const { characterId, condition } = ev.detail;
        handleRemoteAddCondition(characterId, condition as string);
      }

      if (actionType === 'removeCondition') {
        const { characterId, condition } = ev.detail;
        handleRemoteRemoveCondition(characterId, condition as string);
      }

      if (actionType === 'toggleStatus') {
        const { characterId, statusType, value } = ev.detail;
        handleRemoteToggleStatus(
          characterId,
          statusType as CharacterStatus,
          value as boolean
        );
      }
    };

    window.addEventListener('playerAction', onPlayerAction);
    return () => {
      window.removeEventListener('playerAction', onPlayerAction);
    };
  }, [
    handleRemoteHpUpdate,
    handleRemoteAddCondition,
    handleRemoteRemoveCondition,
    handleRemoteToggleStatus,
  ]);

  // playerConnected
  useEffect(() => {
    const onPlayerConnected: EventListener = (e: Event) => {
      const ev = e as CustomEvent<unknown>;
      console.log('Received player connected event:', ev.detail);
      sendGameState();
    };

    window.addEventListener('playerConnected', onPlayerConnected);

    return () => {
      window.removeEventListener('playerConnected', onPlayerConnected);
    };
  }, [sendGameState]);
};

export default useMapEventListeners;
