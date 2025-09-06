export function getId(): string {
  const g = globalThis as typeof globalThis;
  if (g.crypto && typeof g.crypto.randomUUID === 'function') {
    return g.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
}
