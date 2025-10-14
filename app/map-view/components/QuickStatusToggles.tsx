'use client';

import { Focus, Sparkles, XCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface QuickStatusTogglesProps {
  hasAdvantage?: boolean;
  hasDisadvantage?: boolean;
  concentrating?: boolean;
  onToggleAdvantage: () => void;
  onToggleDisadvantage: () => void;
  onToggleConcentration: () => void;
  size?: 'sm' | 'md';
}

export function QuickStatusToggles({
  hasAdvantage,
  hasDisadvantage,
  concentrating,
  onToggleAdvantage,
  onToggleDisadvantage,
  onToggleConcentration,
  size = 'md',
}: QuickStatusTogglesProps) {
  const buttonSize = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-2';

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        size="sm"
        variant="outline"
        aria-pressed={hasAdvantage}
        className={buttonSize}
        style={
          hasAdvantage
            ? {
                backgroundColor: '#059669',
                borderColor: '#059669',
                color: 'white',
              }
            : undefined
        }
        onClick={onToggleAdvantage}
        title="Advantage on attacks/checks"
      >
        <Sparkles className="w-4 h-4 mr-1" />
        ADV
      </Button>

      <Button
        size="sm"
        variant="outline"
        aria-pressed={hasDisadvantage}
        className={buttonSize}
        style={
          hasDisadvantage
            ? {
                backgroundColor: '#e11d48',
                borderColor: '#e11d48',
                color: 'white',
              }
            : undefined
        }
        onClick={onToggleDisadvantage}
        title="Disadvantage on attacks/checks"
      >
        <XCircle className="w-4 h-4 mr-1" />
        DIS
      </Button>

      <Button
        size="sm"
        variant="outline"
        aria-pressed={concentrating}
        className={buttonSize}
        style={
          concentrating
            ? {
                backgroundColor: '#7c3aed',
                borderColor: '#7c3aed',
                color: 'white',
              }
            : undefined
        }
        onClick={onToggleConcentration}
        title="Concentrating on a spell"
      >
        <Focus className="w-4 h-4 mr-1" />
        CONC
      </Button>
    </div>
  );
}
