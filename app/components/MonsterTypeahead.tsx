import { X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);

  // highlight index for hover/keyboard
  const [activeIdx, setActiveIdx] = useState<number>(-1);

  // mount host: inside dialog so outside-pointer-events don't block clicks
  useEffect(() => {
    const host = inputRef.current?.closest(
      '[role="dialog"]'
    ) as HTMLElement | null;
    setPortalHost(host ?? document.body);
  }, []);

  // keep menu positioned to input
  useLayoutEffect(() => {
    if (!showDropdown) return;
    const el = inputRef.current;
    if (!el) return;
    const update = () => setMenuRect(el.getBoundingClientRect());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [showDropdown]);

  const filteredMonsters = query.trim()
    ? monsters
        .filter((m) => m.name.toLowerCase().startsWith(query.toLowerCase()))
        .slice(0, 10)
    : [];

  // close on outside click
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

  // sync when a monster is programmatically selected
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
    setActiveIdx(-1);
  };

  const handleClear = () => {
    setQuery('');
    onClear();
    inputRef.current?.focus();
    setActiveIdx(-1);
  };

  // --- derive layout values & open flag HERE (before return) ---
  const hostRect = portalHost?.getBoundingClientRect();
  const left = menuRect ? menuRect.left - (hostRect?.left ?? 0) : 0;
  const top = menuRect ? menuRect.bottom - (hostRect?.top ?? 0) + 4 : 0;
  const width = menuRect?.width;
  const menuOpen =
    !!portalHost && showDropdown && !!menuRect && filteredMonsters.length > 0;

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
            setActiveIdx(-1);
          }}
          onFocus={() => query && setShowDropdown(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (filteredMonsters.length) {
                setActiveIdx((i) => (i + 1) % filteredMonsters.length);
                setShowDropdown(true);
              }
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (filteredMonsters.length) {
                setActiveIdx(
                  (i) =>
                    (i - 1 + filteredMonsters.length) % filteredMonsters.length
                );
                setShowDropdown(true);
              }
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (activeIdx >= 0 && activeIdx < filteredMonsters.length) {
                handleSelect(filteredMonsters[activeIdx]);
              }
            } else if (e.key === 'Escape') {
              setShowDropdown(false);
              setActiveIdx(-1);
            }
          }}
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

      {menuOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            className="fixed max-h-60 overflow-y-auto rounded-md border border-gray-300 shadow-lg pointer-events-auto"
            style={{
              left,
              top,
              width,
              backgroundColor: '#ffffff', // hard white, truly opaque
              zIndex: 2147483647,
              isolation: 'isolate',
              mixBlendMode: 'normal',
              WebkitBackdropFilter: 'none',
              backdropFilter: 'none',
            }}
          >
            {filteredMonsters.map((monster, i) => {
              const isActive = i === activeIdx;
              return (
                <button
                  id={`monster-opt-${i}`}
                  key={monster.name}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(monster)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`w-full px-3 py-2 text-left border-b border-gray-100 last:border-b-0 transition-colors outline-none ${
                    isActive ? 'bg-gray-100' : 'bg-white'
                  }`}
                >
                  <div className="font-medium">{monster.name}</div>
                  <div className="text-xs text-gray-500">
                    {monster.type} • HP: {monster.hp.average} (default){' / '}
                    {monster.hp.max} (max)
                  </div>
                </button>
              );
            })}
          </div>,
          portalHost!
        )}
    </div>
  );
}
