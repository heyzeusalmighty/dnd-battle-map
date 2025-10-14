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
        variant={hasAdvantage ? 'default' : 'outline'}
        onClick={onToggleAdvantage}
        className={`${buttonSize} ${
          hasAdvantage ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50'
        }`}
        title="Advantage on attacks/checks"
      >
        <Sparkles className="w-4 h-4 mr-1" />
        ADV
      </Button>

      <Button
        size="sm"
        variant={hasDisadvantage ? 'default' : 'outline'}
        onClick={onToggleDisadvantage}
        className={`${buttonSize} ${
          hasDisadvantage ? 'bg-red-600 hover:bg-red-700' : 'hover:bg-red-50'
        }`}
        title="Disadvantage on attacks/checks"
      >
        <XCircle className="w-4 h-4 mr-1" />
        DIS
      </Button>

      <Button
        size="sm"
        variant={concentrating ? 'default' : 'outline'}
        onClick={onToggleConcentration}
        className={`${buttonSize} ${
          concentrating
            ? 'bg-purple-600 hover:bg-purple-700'
            : 'hover:bg-purple-50'
        }`}
        title="Concentrating on a spell"
      >
        <Focus className="w-4 h-4 mr-1" />
        CONC
      </Button>
    </div>
  );
}
