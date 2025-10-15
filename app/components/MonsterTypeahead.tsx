import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Monster } from '../map/types';

interface MonsterTypeaheadProps {
  monsters: Monster[];
  onSelect: (monster: Monster) => void;
  onClear: () => void;
  selectedMonster: Monster | null;
  disabled?: boolean;
}

export function MonsterTypeahead({
  monsters,
  onSelect,
  onClear,
  selectedMonster,
  disabled = false,
}: MonsterTypeaheadProps) {
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredMonsters = query.trim()
    ? monsters
        .filter((m) => m.name.toLowerCase().startsWith(query.toLowerCase()))
        .slice(0, 10)
    : [];

  // click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedMonster) {
      setQuery(selectedMonster.name);
      setShowDropdown(false);
    }
  }, [selectedMonster]);

  const handleSelect = (monster: Monster) => {
    onSelect(monster);
    setQuery(monster.name);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setQuery('');
    onClear();
    // focus input after clearing
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => query && setShowDropdown(true)}
          placeholder="Search monsters..."
          disabled={disabled}
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && filteredMonsters.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredMonsters.map((monster) => (
            <button
              key={monster.name}
              type="button"
              onClick={() => handleSelect(monster)}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium">{monster.name}</div>
              <div className="text-sm text-gray-500">
                {monster.type} • CR {monster.cr}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
