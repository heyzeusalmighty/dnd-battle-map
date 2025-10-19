export type PartyPreset = {
  name: string;
  hp: number;
  initiative: number;
  initiativeMod: number;
  ac?: number;
  color?: string;
};

export const DEFAULT_PARTY: PartyPreset[] = [
  {
    name: 'Maelin',
    hp: 38,
    initiative: 0,
    initiativeMod: 2,
    ac: 17,
    color: '#3B82F6',
  },
  {
    name: 'Aria',
    hp: 38,
    initiative: 0,
    initiativeMod: 4,
    ac: 17,
    color: '#F59E0B',
  },
  {
    name: 'Farmish',
    hp: 37,
    initiative: 0,
    initiativeMod: 0,
    ac: 13,
    color: '#10B981',
  },
  {
    name: 'Yustuss',
    hp: 54,
    initiative: 0,
    initiativeMod: 0,
    ac: 18,
    color: '#A855F7',
  },
];
