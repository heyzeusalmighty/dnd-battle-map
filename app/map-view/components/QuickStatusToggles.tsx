'use client';

import { Focus, Sparkles, XCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');

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
      <button className="bg-emerald-600 text-white border border-emerald-600 px-2 py-1 rounded">
        plain test
      </button>
      <Button
        size="sm"
        variant="outline"
        aria-pressed={hasAdvantage}
        className={cx(
          buttonSize,
          hasAdvantage && 'bg-emerald-600 text-white border-emerald-600'
        )}
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
        className={cx(
          buttonSize,
          hasDisadvantage && 'bg-rose-600 text-white border-rose-600'
        )}
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
        className={cx(
          buttonSize,
          concentrating && 'bg-violet-600 text-white border-violet-600'
        )}
        onClick={onToggleConcentration}
        title="Concentrating on a spell"
      >
        <Focus className="w-4 h-4 mr-1" />
        CONC
      </Button>{' '}
    </div>
  );
}
