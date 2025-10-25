import type { MoveCharacterData } from '@/app/hooks/websockets.types';
import { useEffect } from 'react';

interface MapEventListenersProps {
  handleRemoteCharacterMove: (data: MoveCharacterData) => void;
  handleRemoteHpUpdate: (characterId: string, newHp: number) => void;
  sendGameState: () => void;
}

const useMapEventListeners = ({
  handleRemoteCharacterMove,
  handleRemoteHpUpdate,
  sendGameState,
}: MapEventListenersProps) => {
  useEffect(() => {
    const onMoveCharacter: EventListener = (e: Event) => {
      const ev = e as CustomEvent<any>;
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
      const ev = e as CustomEvent<any>;
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
      const ev = e as CustomEvent<any>;
      console.log('Received player action event:', ev.detail);

      handleRemoteHpUpdate(ev.detail.characterId, ev.detail.newHp);
    };

    window.addEventListener('playerAction', onPlayerAction);
    return () => {
      window.removeEventListener('playerAction', onPlayerAction);
    };
  }, [handleRemoteHpUpdate]);

  // playerConnected
  useEffect(() => {
    const onPlayerConnected: EventListener = (e: Event) => {
      const ev = e as CustomEvent<any>;
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
