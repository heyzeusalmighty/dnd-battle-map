// choose token classes based on PC/NPC and selection
  export const tokenClasses = (isPlayer: boolean, isSelected: boolean) =>
    [
      'absolute z-10 flex items-center justify-center',
      isPlayer ? 'rounded-full' : 'rounded-md',

      // Base (subtle) outline via ring; no borders at all
      'ring-1 ring-black/10 dark:ring-white/20',
      'ring-offset-1 ring-offset-white dark:ring-offset-neutral-900',

      // Selection emphasis
      isSelected ? (isPlayer ? 'ring-2 ring-blue-500/70' : 'ring-2 ring-red-600/70') : '',

      // Optional: small polish
      'shadow-sm transition-all duration-150',
      // If you set fill inline via style={{ backgroundColor: c.color }},
      // you can drop bg-background. Keep it only if you rely on a CSS var:
      // "bg-background",
    ].join(' ');