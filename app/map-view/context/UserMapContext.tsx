import { createContext, type ReactNode, useContext, useState } from 'react';

import type { AppSnapshot } from '../../map/types';
import { coolCharacters, coolDemoTerrain } from '../../map/utils/demo';

interface UserMapContextType {
  state: {
    gameState: AppSnapshot;
    username: string;
    submitted: boolean;
    messageCount: number;
    selectedCharacterId: string | null;
    hoveredCell?: { x: number; y: number } | null;
  };
  actions: {
    setGameState: React.Dispatch<React.SetStateAction<AppSnapshot>>;
    setUsername: React.Dispatch<React.SetStateAction<string>>;
    setSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
    setMessageCount: React.Dispatch<React.SetStateAction<number>>;
    setSelectedCharacterId: React.Dispatch<React.SetStateAction<string | null>>;
    setHoveredCell: React.Dispatch<
      React.SetStateAction<{ x: number; y: number } | null | undefined>
    >;
  };
  handlers: {
    handleCellClick: (x: number, y: number) => void;
    handleCharacterClick: (characterId: string) => void;
  };
}

const MapContext = createContext<UserMapContextType | undefined>(undefined);

interface UserMapProviderProps {
  children: ReactNode;
}

export const UserMapProvider = ({ children }: UserMapProviderProps) => {
  const [gameState, setGameState] = useState<AppSnapshot>({
    id: 0,
    terrain: coolDemoTerrain,
    characters: coolCharacters,
    customObjects: [],
    currentTurn: 0,
    measurements: [],
    mapHeight: 20,
    mapWidth: 20,
    gridScale: 1,
    round: 1,
    selectedTool: 'terrain',
    damageLog: [],
  });
  const [username, setUsername] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null
  );
  const [hoveredCell, setHoveredCell] = useState<{
    x: number;
    y: number;
  } | null>();

  const handleCellClick = (x: number, y: number) => {
    if (selectedCharacterId) {
      setGameState((prev) => {
        const updatedCharacters = prev.characters.map((c) =>
          c.id === selectedCharacterId ? { ...c, x, y } : c
        );
        return { ...prev, characters: updatedCharacters };
      });
    }
  };

  const handleCharacterClick = (characterId: string) => {
    const selectedChar = gameState.characters.find((c) => c.id === characterId);

    if (selectedChar?.isPlayer) {
      setSelectedCharacterId((prev) =>
        prev === characterId ? null : characterId
      );
    } else {
      setSelectedCharacterId(null);
    }
  };

  const value = {
    state: {
      gameState,
      username,
      submitted,
      messageCount,
      selectedCharacterId,
      hoveredCell,
    },
    actions: {
      setGameState,
      setUsername,
      setSubmitted,
      setMessageCount,
      setSelectedCharacterId,
      setHoveredCell,
    },
    handlers: {
      handleCellClick,
      handleCharacterClick,
    },
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};

export const useUserMapContext = () => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useUserMapContext must be used within a UserMapProvider');
  }
  return context;
};
