export const INITIATIVE_CAP = 20;
export const capInit = (n: number) => Math.min(INITIATIVE_CAP, n);

export const d20 = (rng = Math.random) => Math.floor(rng() * 20) + 1;
export function rollInitiativeOnce(opts?: {
  advantage?: boolean;
  disadvantage?: boolean;
}) {
  const a = d20(),
    b = d20();
  if (opts?.advantage) return Math.max(a, b);
  if (opts?.disadvantage) return Math.min(a, b);
  return a;
}
