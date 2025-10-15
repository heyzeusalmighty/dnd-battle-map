// app/hooks/useMonsterSearch.ts
import { useEffect, useMemo, useState } from 'react';
import type { Monster } from '../../map/types';

export function useMonsterSearch() {
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // load monsters from JSON when component mounts
  useEffect(() => {
    async function loadMonsters() {
      try {
        const response = await fetch('/data/monsters.json');

        if (!response.ok) {
          throw new Error('Failed to load monsters');
        }

        const data = await response.json();
        setMonsters(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadMonsters();
  }, []);

  const searchMonsters = useMemo(() => {
    return (query: string): Monster[] => {
      if (!query.trim()) {
        return [];
      }

      const lowerQuery = query.toLowerCase();
      const results = monsters.filter((monster) =>
        monster.name.toLowerCase().startsWith(lowerQuery)
      );

      // making sure we return at most 10 results
      return results.slice(0, 10);
    };
  }, [monsters]);

  return {
    monsters,
    loading,
    error,
    searchMonsters,
  };
}
