import { Badge } from '../components/ui/badge';

type StatusKind = 'ADV' | 'DIS' | 'CONC' | 'COND';

const STYLES: Record<StatusKind, { bg: string; border: string }> = {
  ADV: { bg: '#059669', border: '#059669' }, // emerald-600
  DIS: { bg: '#e11d48', border: '#e11d48' }, // rose-600
  CONC: { bg: '#7c3aed', border: '#7c3aed' }, // violet-600
  COND: { bg: '#d97706', border: '#d97706' }, // amber-600
};

type Props = {
  kind: StatusKind;
  children: React.ReactNode;
  className?: string;
  title?: string;
};

export function StatusBadge({ kind, children, className, title }: Props) {
  const colors = STYLES[kind];

  return (
    <Badge
      className={`h-5 px-1.5 text-xs leading-none rounded-sm font-medium tracking-wide ${className || ''}`}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: 'white',
      }}
      title={title}
    >
      {children}
    </Badge>
  );
}
