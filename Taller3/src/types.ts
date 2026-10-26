/**
 * Tipos compartidos del proyecto.
 * Mantener aquí los contratos evita dependencias circulares entre módulos.
 */

/** Estados de la máquina de combate. */
export enum CombatState {
  /** Sin ataque: el rival espera / se reposiciona. */
  IDLE = 'IDLE',
  /** Telegrafiado: el rival carga el golpe. Aquí se abre la ventana de parry. */
  WINDUP = 'WINDUP',
  /** El golpe está en el aire. Al terminar este estado se resuelve el daño. */
  ATTACK_ACTIVE = 'ATTACK_ACTIVE',
  /** Recuperación tras atacar o tras ser bloqueado. */
  COOLDOWN = 'COOLDOWN',
  /** Reacción a golpe / aturdimiento (stagger). */
  HIT = 'HIT',
}

/** Paleta de un combatiente (colores en formato 0xRRGGBB). */
export interface Palette {
  /** Sombra / capa / zonas profundas. */
  dark: number;
  /** Cuerpo principal. */
  body: number;
  /** Placas y zonas iluminadas. */
  light: number;
  /** Color de acento (filo, cinturón, brillos). */
  accent: number;
  /** Luz de contorno. */
  rim: number;
  /** Brillo del visor. */
  eye: number;
}

/** Tipo de arma que porta un rival. */
export type WeaponKind = 'sword' | 'axe' | 'spear' | 'greatsword';

/** Silueta de casco / cresta. */
export type CrestKind = 'blade' | 'horn' | 'halo' | 'spike';

/** Definición de un rival del roster. */
export interface EnemyProfile {
  /** Identificador interno (también nombra su textura). */
  key: string;
  /** Nombre mostrado en el HUD. */
  name: string;
  /** Epíteto / título. */
  title: string;
  palette: Palette;
  weapon: WeaponKind;
  crest: CrestKind;
  /** Ancho relativo del cuerpo (1 = base). */
  bulk: number;
}

/** Datos que se muestran en la pantalla de derrota. */
export interface RunStats {
  enemiesDefeated: number;
  bestCombo: number;
  perfects: number;
  totalParries: number;
}
