export const VIEW = { width: 960, height: 540 };
export const WORLD = { width: 3580, height: 700, floor: 592 };
export const ARMOR = { x: 1128, y: 556 };
export const SIDE_WEAPON = { x: 1900, y: 394 };
export const CHECKPOINTS = [
  { x: 169, y: 566, name: 'Colonia' },
  { x: 2180, y: 566, name: 'Refugio' },
] as const;
export const ARENA = { entrance: 2420, exit: 3315, boss: 3010 };
export const ZONES = [
  { x: 0, name: 'Colonia profunda', hint: 'A / D para moverte   ·   Espacio para saltar' },
  { x: 480, name: 'Galerías hundidas', hint: 'Salta los huecos   ·   Shift para impulsarte en el aire' },
  { x: 770, name: 'Corredor de guardia', hint: 'Clic derecho en la dirección de avance   ·   R justo antes del impacto' },
  { x: 1350, name: 'Galería del vigía', hint: 'Apunta con el ratón   ·   Clic izquierdo para disparar' },
  { x: 2110, name: 'Refugio de tránsito', hint: 'E para descansar   ·   Q para usar un inyector' },
  { x: 2420, name: 'Umbral imperial', hint: '' },
] as const;

export const PLATFORMS = [
  { x: 0, y: 592, w: 610, h: 140 },
  { x: 708, y: 592, w: 599, h: 140 },
  { x: 1411, y: 592, w: 657, h: 140 },
  { x: 2160, y: 592, w: 1420, h: 140 },
  { x: 395, y: 515, w: 122, h: 25 },
  { x: 618, y: 529, w: 77, h: 24 },
  { x: 1452, y: 520, w: 136, h: 24 },
  { x: 1642, y: 447, w: 131, h: 24 },
  { x: 1835, y: 421, w: 133, h: 24 },
  { x: 1974, y: 530, w: 79, h: 24 },
];

export const WEAPONS = {
  pulse: { label: 'Pulso', cost: 14, damage: 15, speed: 710, delay: 260, color: 0x6ff6ee },
  lance: { label: 'Lanza', cost: 28, damage: 31, speed: 940, delay: 520, color: 0xffce83 },
} as const;
export type Weapon = keyof typeof WEAPONS;

export interface Run {
  checkpoint: number;
  weapons: Weapon[];
  weaponIndex: number;
  bossDefeated: boolean;
  visited: number;
}
export const newRun = (): Run => ({
  checkpoint: 0,
  weapons: [],
  weaponIndex: 0,
  bossDefeated: false,
  visited: 0,
});

export const BALANCE = {
  life: 100,
  injectors: 3,
  heal: 35,
  parries: 3,
  parryRecharge: 4800,
  parryWindow: 225,
  parryCooldown: 550,
  energy: 100,
  passiveEnergy: 12,
  strikeEnergy: 16,
  strikeFrenzy: 25,
  frenzyDuration: 5200,
  speed: 248,
  jump: 500,
  dashSpeed: 680,
  dashDuration: 165,
  dashCooldown: 680,
} as const;

