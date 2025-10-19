// demo.ts — development/demo seed data
import type { Character, Terrain } from '../types';
import { DEFAULT_PARTY } from './partyPresets';

const sid = (k: string) => `seed:${k}`;

// tiny helper
const presetByName = (name: string) =>
  DEFAULT_PARTY.find((p) => p.name === name);

export function demoCharacters(): Character[] {
  const mae = presetByName('Maelin');

  const maelin: Character = {
    id: sid('maelin'),
    name: 'Maelin',
    x: 2,
    y: 2,
    hp: 7,
    maxHp: mae?.hp ?? 38,
    totalDamage: 0,
    initiative: 1,
    // ✅ pull the default bonus from presets
    initiativeMod: mae?.initiativeMod ?? 0,
    isPlayer: true,
    // keep color in sync with presets but fall back to old value
    color: mae?.color ?? '#3B82F6',
    // include AC if your Character type supports it
    ...(mae?.ac ? { ac: mae.ac } : {}),
  };

  const zombie: Character = {
    id: sid('zombie'),
    name: 'V Rude Zombie',
    x: 8,
    y: 6,
    hp: 22,
    maxHp: 22,
    totalDamage: 0,
    initiative: 20,
    isPlayer: false,
    npcType: 'standard',
    color: '#EF4444',
  };

  return [maelin, zombie];
}

export function demoTerrain(): Terrain[] {
  return [
    { id: sid('t1'), x: 4, y: 4, type: 'wall' },
    { id: sid('t2'), x: 5, y: 4, type: 'wall' },
    { id: sid('t3'), x: 6, y: 4, type: 'wall' },
    // "chest" isn't in TerrainType; use a custom-labeled object:
    { id: sid('chest'), x: 10, y: 8, type: 'chest', label: 'chest' },
  ];
}

export const coolCharacters: Character[] = [
  {
    id: 'seed:maelin',
    name: 'Maelin',
    x: 11,
    y: 4,
    hp: 7,
    maxHp: 31,
    totalDamage: 0,
    initiative: 1,
    initiativeMod: 2,
    isPlayer: true,
    color: '#3B82F6',
    ac: 17,
  },
  {
    id: 'seed:zombie',
    name: 'V Rude Zombie',
    x: 6,
    y: 4,
    hp: 22,
    maxHp: 22,
    totalDamage: 0,
    initiative: 20,
    isPlayer: false,
    npcType: 'standard',
    color: '#EF4444',
  },
];

export const coolDemoTerrain: Terrain[] = [
  {
    id: '945c1a86-4270-48bc-9816-14bb69fbb2df',
    type: 'wall',
    x: 6,
    y: 1,
  },
  {
    id: 'b10bebf5-30ad-4560-9475-557aedbffd8d',
    type: 'wall',
    x: 7,
    y: 1,
  },
  {
    id: '6e35ffd0-bd80-4a77-8ab3-ea66abe62c53',
    type: 'wall',
    x: 8,
    y: 1,
  },
  {
    id: 'eff201a1-73ab-4012-81a2-0b979c2e2640',
    type: 'wall',
    x: 9,
    y: 1,
  },
  {
    id: '3226ed22-d896-4fe2-ba1b-3a4bd579e480',
    type: 'wall',
    x: 10,
    y: 1,
  },
  {
    id: 'd7bdaf15-44b0-4876-9824-b4d2cbbebb4f',
    type: 'wall',
    x: 11,
    y: 1,
  },
  {
    id: '69b67d86-b85a-4d5c-bd84-bf76be43466e',
    type: 'wall',
    x: 5,
    y: 2,
  },
  {
    id: 'aa84218b-c7f3-4165-b7e6-ded52b9880c1',
    type: 'wall',
    x: 4,
    y: 2,
  },
  {
    id: '58f4007c-4633-45a5-8b7d-00fb26a831d4',
    type: 'wall',
    x: 12,
    y: 2,
  },
  {
    id: '2b8a9a4c-c9fb-4538-98e6-e1c258db9a2e',
    type: 'wall',
    x: 13,
    y: 2,
  },
  {
    id: '6ed205d9-b5fd-4ba7-94cf-a242fa06f809',
    type: 'wall',
    x: 3,
    y: 3,
  },
  {
    id: 'af9b1f46-4ce4-417e-a4d2-9601d691c348',
    type: 'wall',
    x: 3,
    y: 4,
  },
  {
    id: 'de7c5a9c-a417-43a3-a254-c9ebf3120c42',
    type: 'wall',
    x: 14,
    y: 3,
  },
  {
    id: 'e36fbb9a-42d8-4140-9f41-7e349a505d56',
    type: 'wall',
    x: 14,
    y: 4,
  },
  {
    id: '0041aca1-b084-4720-af7f-8a4942431ac3',
    type: 'wall',
    x: 2,
    y: 5,
  },
  {
    id: 'e3b1d428-145e-4d5e-a38e-4f1cfc638632',
    type: 'wall',
    x: 2,
    y: 6,
  },
  {
    id: 'b0ae9c16-9d80-4620-910c-c7b0ce534eae',
    type: 'wall',
    x: 2,
    y: 7,
  },
  {
    id: 'ea9a461a-74c1-4669-b803-74d6a2bf9ffa',
    type: 'wall',
    x: 2,
    y: 8,
  },
  {
    id: '0a8aa54e-c7b1-40a8-9e1a-e22f57ecc0dd',
    type: 'wall',
    x: 15,
    y: 5,
  },
  {
    id: '71bfea0f-0349-42b7-9968-f1b23dfcf02c',
    type: 'wall',
    x: 15,
    y: 6,
  },
  {
    id: 'ff790fb1-83c6-4b6f-84b6-de1df12dacf3',
    type: 'wall',
    x: 15,
    y: 7,
  },
  {
    id: 'f2803954-8c07-414c-9432-0157fbb5e406',
    type: 'wall',
    x: 15,
    y: 8,
  },
  {
    id: '2cafec92-2a24-4693-9baa-c62e0eeeb47f',
    type: 'wall',
    x: 3,
    y: 9,
  },
  {
    id: 'aff654ff-1a47-4563-9acc-a63ef4745a6d',
    type: 'wall',
    x: 3,
    y: 10,
  },
  {
    id: 'a7316ebd-0fb1-48ec-9c32-5d32bae9295c',
    type: 'wall',
    x: 14,
    y: 9,
  },
  {
    id: '56a16a33-0459-425c-9512-e0eb1f509cb3',
    type: 'wall',
    x: 14,
    y: 10,
  },
  {
    id: '59099f68-2f14-430a-9d6b-d12dc480e9ad',
    type: 'wall',
    x: 4,
    y: 11,
  },
  {
    id: '39912991-8c7c-4f1e-8d95-e1c3f7053662',
    type: 'wall',
    x: 13,
    y: 11,
  },
  {
    id: 'd661bd74-7de6-46d2-9486-09b27f719b01',
    type: 'wall',
    x: 5,
    y: 12,
  },
  {
    id: '1110c0e6-7bab-450d-bcc7-49b6d9ff58d1',
    type: 'wall',
    x: 5,
    y: 13,
  },
  {
    id: 'e7896ac2-6319-4153-896f-90d38d0efd95',
    type: 'wall',
    x: 5,
    y: 14,
  },
  {
    id: '6d848809-8aee-486b-87d1-cacf081b6345',
    type: 'wall',
    x: 5,
    y: 15,
  },
  {
    id: 'cbd65923-1046-4094-855d-014d2ada683c',
    type: 'wall',
    x: 12,
    y: 12,
  },
  {
    id: '45225cac-5e26-4958-804c-54e78a330817',
    type: 'wall',
    x: 12,
    y: 13,
  },
  {
    id: 'b3d1d90f-16a9-4ca3-902e-435bc3f6de41',
    type: 'wall',
    x: 12,
    y: 14,
  },
  {
    id: 'b62e2d07-d627-4f64-bd2d-b5df8bb88960',
    type: 'wall',
    x: 12,
    y: 15,
  },
  {
    id: '18d1c311-7836-4c8f-bccd-bae16a6388f1',
    type: 'wall',
    x: 6,
    y: 16,
  },
  {
    id: '921a878e-43fd-4a5e-92c7-62e633c32e85',
    type: 'wall',
    x: 7,
    y: 16,
  },
  {
    id: '8771d716-7b3f-47cb-80b5-318b443ac41a',
    type: 'wall',
    x: 8,
    y: 16,
  },
  {
    id: '770ee6ed-b143-4d43-9f99-e3e4f1d6012c',
    type: 'wall',
    x: 9,
    y: 16,
  },
  {
    id: '14159bb8-c837-434a-94da-46a0ba67989c',
    type: 'wall',
    x: 10,
    y: 16,
  },
  {
    id: 'c6781ca2-a0e9-404f-90e1-e9d95d17d015',
    type: 'wall',
    x: 11,
    y: 16,
  },
  {
    id: '2d5165e5-aae9-4fb3-b535-5b9401d33847',
    type: 'wall',
    x: 7,
    y: 15,
  },
  {
    id: '02b37d3e-20ee-45eb-b525-48689f8fa426',
    type: 'wall',
    x: 9,
    y: 15,
  },
  {
    id: '40906350-76da-470e-ba33-e5930daf51a2',
    type: 'wall',
    x: 11,
    y: 15,
  },
  {
    id: '1a5c8d1a-a4a2-4956-86c2-1209bb176574',
    type: 'wall',
    x: 8,
    y: 11,
  },
  {
    id: '83231cfd-1dfb-4b90-99f9-ccdb280befa6',
    type: 'wall',
    x: 8,
    y: 12,
  },
  {
    id: '4e24aff1-8352-4449-9f4b-ce0d599e08eb',
    type: 'wall',
    x: 9,
    y: 12,
  },
  {
    id: 'd8eab54d-f804-4a56-9366-a842500699fa',
    type: 'wall',
    x: 9,
    y: 11,
  },
  {
    id: '4dd4a927-b654-426d-bb9d-e2f4c3dd21b1',
    type: 'wall',
    x: 7,
    y: 9,
  },
  {
    id: '40464200-8679-4471-ab38-964310ec1b08',
    type: 'wall',
    x: 6,
    y: 9,
  },
  {
    id: '63690a58-6f5e-4922-8463-66e8e8e43ca8',
    type: 'wall',
    x: 6,
    y: 10,
  },
  {
    id: '0fa16421-0a12-4d8a-86c2-98962455d6df',
    type: 'wall',
    x: 6,
    y: 8,
  },
  {
    id: '1e6c767f-37a9-4589-90f1-4ec833d05c8b',
    type: 'wall',
    x: 6,
    y: 7,
  },
  {
    id: '931d599f-a721-4467-ba2b-ac65223cbca2',
    type: 'wall',
    x: 5,
    y: 7,
  },
  {
    id: '7d5aec3e-6f5f-4091-9528-0a700c0dbaff',
    type: 'wall',
    x: 5,
    y: 6,
  },
  {
    id: '3268ad55-93d0-4e27-bc81-75f8ea76f4ca',
    type: 'wall',
    x: 6,
    y: 6,
  },
  {
    id: 'ca5f745e-0c5a-4d3a-92cb-7642578f79cf',
    type: 'wall',
    x: 7,
    y: 7,
  },
  {
    id: '14da5666-9295-4f8b-bf7e-d6a79d598c7a',
    type: 'wall',
    x: 7,
    y: 8,
  },
  {
    id: 'd7ac6cf4-982b-4d35-a1a0-37cb04ee3a10',
    type: 'wall',
    x: 10,
    y: 9,
  },
  {
    id: '8784b794-10b7-4852-b4b0-fbc91b59c00b',
    type: 'wall',
    x: 11,
    y: 9,
  },
  {
    id: '42699b2a-82b6-4b19-ab3c-74dcbb183e61',
    type: 'wall',
    x: 11,
    y: 10,
  },
  {
    id: 'd40e5fda-94b9-4674-b940-c951dc80ef4f',
    type: 'wall',
    x: 11,
    y: 8,
  },
  {
    id: '8d7ec111-215b-44a3-a7c5-2c4a90c99fe2',
    type: 'wall',
    x: 11,
    y: 7,
  },
  {
    id: '0feca9a6-0406-4ef3-861f-6b280c2e6626',
    type: 'wall',
    x: 11,
    y: 6,
  },
  {
    id: 'cd5349d1-a880-4f01-9da0-f7249be62bea',
    type: 'wall',
    x: 10,
    y: 7,
  },
  {
    id: 'afd8f029-c9ff-4783-9e35-59370f83f5b0',
    type: 'wall',
    x: 10,
    y: 8,
  },
  {
    id: '9048d803-df94-4505-9e55-43c11f37429a',
    type: 'wall',
    x: 12,
    y: 6,
  },
  {
    id: '9ca89ada-27c4-4e26-835c-8e1579354b6e',
    type: 'wall',
    x: 12,
    y: 7,
  },
  {
    id: '2f35da2d-b762-40d3-bff2-125081482a8e',
    type: 'wall',
    x: 5,
    y: 8,
  },
  {
    id: 'e5bbf4a2-688a-481b-969e-48efc7799c3c',
    type: 'wall',
    x: 5,
    y: 9,
  },
  {
    id: '412d5fe7-36f7-4fcb-92da-cf67ad6d19c8',
    type: 'wall',
    x: 12,
    y: 8,
  },
  {
    id: '0dba69b7-4851-4f06-b48d-6cf1a324ea88',
    type: 'wall',
    x: 12,
    y: 9,
  },
];
