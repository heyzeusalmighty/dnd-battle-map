import { Badge } from '../components/ui/badge';

const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');

type StatusKind = 'ADV' | 'DIS' | 'CONC' | 'COND';

const STYLES: Record<StatusKind, string> = {
  ADV: 'bg-emerald-600 text-white border-emerald-600',
  DIS: 'bg-rose-600 text-white border-rose-600',
  CONC: 'bg-violet-600 text-white border-violet-600',
  COND: 'bg-amber-600 text-white border-amber-600',
};

type Props = {
  kind: StatusKind;
  children: React.ReactNode;
  className?: string;
  title?: string;
};

export function StatusBadge({ kind, children, className, title }: Props) {
  return (
    <Badge
      className={cx(
        'h-5 px-1.5 text-[10px] leading-none rounded-sm font-medium tracking-wide',
        STYLES[kind],
        className
      )}
      title={title}
    >
      {children}
    </Badge>
  );
}
