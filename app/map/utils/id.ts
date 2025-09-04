export function getId(): string {
  const g: any = globalThis as any;
  if (g.crypto && typeof g.crypto.randomUUID === "function") {
    return g.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
  }