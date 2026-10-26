import type { EnemyProfile, Palette } from '../types';

/* -------------------------------------------------------------------------- */
/*  LIENZO                                                                     */
/* -------------------------------------------------------------------------- */

export const VIEW = {
  WIDTH: 1280,
  HEIGHT: 720,
  /** Y del suelo donde apoyan los combatientes. */
  GROUND_Y: 566,
} as const;

/* -------------------------------------------------------------------------- */
/*  BALANCE — todo lo que se toca para ajustar dificultad                      */
/* -------------------------------------------------------------------------- */

/**
 * Cada valor está documentado para poder afinar el "feel" sin leer el resto
 * del código. Las unidades de tiempo son milisegundos.
 */
export const BALANCE = {
  /* --- Vida ------------------------------------------------------------- */
  PLAYER_MAX_HP: 100,
  /** Vida recuperada al derrotar a un rival (premia encadenar parrys). */
  PLAYER_HEAL_PER_WAVE: 12,

  ENEMY_MAX_HP: 100,
  /** HP extra por cada rival derrotado. */
  ENEMY_HP_STEP: 18,
  ENEMY_HP_CAP: 240,

  /* --- Daño ------------------------------------------------------------- */
  ENEMY_ATTACK_DAMAGE: 12,
  /** Daño extra que hace el rival por cada ronda superada. */
  ENEMY_DAMAGE_STEP: 2,
  /** Daño que recibe el rival al ser desviado. */
  PARRY_DAMAGE: 25,
  /** Daño extra si el parry cae en el centro de la ventana ("perfecto"). */
  PERFECT_PARRY_BONUS: 9,

  /* --- Ventana de parry -------------------------------------------------- */
  /** Ventana base, antes del impacto, para desviar. */
  BASE_PARRY_WINDOW: 280,
  /** Cuánto se estrecha la ventana por cada rival derrotado. */
  WINDOW_DECREMENT_PER_ROUND: 26,
  /** Suelo de dificultad: la ventana nunca baja de aquí. */
  MIN_PARRY_WINDOW: 90,
  /** Margen de indulgencia DESPUÉS del impacto visual (late-parry). */
  PARRY_GRACE_AFTER: 90,

  /* --- Telegrafiado ------------------------------------------------------ */
  /** Duración base del wind-up (carga del golpe). */
  BASE_WINDUP: 950,
  WINDUP_DECREMENT_PER_ROUND: 70,
  MIN_WINDUP: 280,

  /* --- Ritmo del rival --------------------------------------------------- */
  ENEMY_IDLE_TIME: 460,
  ENEMY_IDLE_DECREMENT: 15,
  MIN_ENEMY_IDLE: 240,

  ENEMY_COOLDOWN: 720,
  ENEMY_COOLDOWN_DECREMENT: 55,
  MIN_ENEMY_COOLDOWN: 320,

  /** Duración del stagger al recibir un parry. */
  HIT_STAGGER: 360,

  /* --- Castigo por fallar ------------------------------------------------ */
  /**
   * Bloqueo tras pulsar fuera de la ventana. Evita el "spam" de clics y hace
   * que adelantarse cueste caro: si te bloqueas, llegas tarde al golpe real.
   */
  FAILED_PARRY_LOCKOUT: 420,

  /* --- Feedback ---------------------------------------------------------- */
  HITSTOP_MS: 60,
  PERFECT_HITSTOP_MS: 95,
} as const;

/* -------------------------------------------------------------------------- */
/*  PERSONAJES                                                                 */
/* -------------------------------------------------------------------------- */

export const PLAYER_PALETTE: Palette = {
  dark: 0x0d1a24,
  body: 0x27566e,
  light: 0x3d8aa8,
  accent: 0x46e3c8,
  rim: 0xa8ffec,
  eye: 0xe6fffd,
};

/**
 * Roster de rivales. El ciclo recorre la lista y, al terminarla, vuelve al
 * primero con la dificultad acumulada (más rápido, ventana más corta, más HP).
 */
export const ENEMY_ROSTER: EnemyProfile[] = [
  {
    key: 'enemy_1',
    name: 'GUARDIÁN DE BRONCE',
    title: 'Centinela del umbral',
    palette: {
      dark: 0x241708,
      body: 0x5a3d1b,
      light: 0x835b28,
      accent: 0xe8a84a,
      rim: 0xffcf8a,
      eye: 0xffe3b0,
    },
    weapon: 'sword',
    crest: 'blade',
    bulk: 1,
  },
  {
    key: 'enemy_2',
    name: 'VERDUGO CARMESÍ',
    title: 'Filo que no perdona',
    palette: {
      dark: 0x280a10,
      body: 0x6b1c2b,
      light: 0x992c3d,
      accent: 0xff4d5e,
      rim: 0xff8f9a,
      eye: 0xffd2d6,
    },
    weapon: 'axe',
    crest: 'horn',
    bulk: 1.1,
  },
  {
    key: 'enemy_3',
    name: 'ESPECTRO DE JADE',
    title: 'Eco de una era muerta',
    palette: {
      dark: 0x07231c,
      body: 0x1a6152,
      light: 0x27927a,
      accent: 0x4dffb0,
      rim: 0xa8ffdb,
      eye: 0xe4fff5,
    },
    weapon: 'spear',
    crest: 'halo',
    bulk: 0.94,
  },
  {
    key: 'enemy_4',
    name: 'SEÑOR DEL VACÍO',
    title: 'El que borra nombres',
    palette: {
      dark: 0x150a26,
      body: 0x3a2080,
      light: 0x5533ab,
      accent: 0xb07bff,
      rim: 0xdcc0ff,
      eye: 0xf3e9ff,
    },
    weapon: 'greatsword',
    crest: 'spike',
    bulk: 1.18,
  },
];
