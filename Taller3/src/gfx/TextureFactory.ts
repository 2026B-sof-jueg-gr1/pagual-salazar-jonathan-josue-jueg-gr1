import Phaser from 'phaser';
import type { CrestKind, Palette, WeaponKind } from '../types';
import { ENEMY_ROSTER, PLAYER_PALETTE } from '../config/GameConfig';

/**
 * Fábrica de texturas.
 *
 * Todo el arte del prototipo se dibuja en tiempo de ejecución con `Graphics`
 * y se "hornea" con `generateTexture()`. Ventajas:
 *  - cero assets externos (el repo pesa poco y no hay 404 en GitHub Pages);
 *  - los colores de cada rival salen de su paleta, sin duplicar PNGs.
 *
 * Estilo: silueta vectorial con sombra de contacto y luz de contorno, para que
 * el personaje se lea contra un fondo oscuro.
 */

export const TEX = {
  ring: 'fx_ring',
  reticle: 'fx_reticle',
  ringThin: 'fx_ring_thin',
  spark: 'fx_spark',
  glow: 'fx_glow',
  slash: 'fx_slash',
  dust: 'fx_dust',
  shadow: 'fx_shadow',
  shard: 'fx_shard',
  weaponSword: 'wpn_sword',
  weaponAxe: 'wpn_axe',
  weaponSpear: 'wpn_spear',
  weaponGreatsword: 'wpn_greatsword',
} as const;

const WEAPON_TEXTURE: Record<WeaponKind, string> = {
  sword: TEX.weaponSword,
  axe: TEX.weaponAxe,
  spear: TEX.weaponSpear,
  greatsword: TEX.weaponGreatsword,
};

/** Clave de la textura del cuerpo de un luchador a partir de su id. */
export const bodyTextureKey = (key: string): string => `body_${key}`;

/** Clave de la textura del arma. */
export const weaponTextureKey = (kind: WeaponKind): string => WEAPON_TEXTURE[kind];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

type G = Phaser.GameObjects.Graphics;

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);

/** Crea un Graphics fuera de pantalla que se destruye tras hornear la textura. */
function scratch(scene: Phaser.Scene): G {
  return scene.add.graphics().setVisible(false);
}

function bake(g: G, key: string, width: number, height: number): void {
  if (!g.scene.textures.exists(key)) {
    g.generateTexture(key, width, height);
  }
  g.destroy();
}

/* -------------------------------------------------------------------------- */
/*  Combatientes                                                               */
/* -------------------------------------------------------------------------- */

const BODY_W = 160;
const BODY_H = 250;

/**
 * Dibuja un guerrero de perfil mirando a la DERECHA.
 * El origen del sprite se fija en (0.5, 1): los pies quedan en y = 240.
 */
function drawFighter(g: G, palette: Palette, bulk: number, crest: CrestKind): void {
  const cx = 80;
  const X = (dx: number): number => cx + dx * bulk;
  const p = palette;

  const poly = (pts: Array<[number, number]>, color: number, alpha = 1): void => {
    g.fillStyle(color, alpha);
    g.fillPoints(
      pts.map(([x, y]) => P(X(x), y)),
      true,
    );
  };

  /* --- sombra de contacto: misma silueta desplazada en casi-negro -------- */
  g.fillStyle(0x04040a, 0.5);
  g.fillRoundedRect(X(-22) + 4, 90, 44 * bulk, 70, 18);
  g.fillRoundedRect(X(-21) + 4, 152, 22, 88, 9);
  g.fillRoundedRect(X(1) + 4, 152, 22, 88, 9);
  g.fillPoints(
    [P(X(-24) + 4, 98), P(X(-6) + 4, 88), P(X(-10) + 4, 158), P(X(-34) + 4, 208), P(X(-42) + 4, 148)],
    true,
  );

  /* --- capa -------------------------------------------------------------- */
  poly(
    [
      [-24, 96],
      [-7, 86],
      [-10, 158],
      [-34, 210],
      [-42, 146],
    ],
    p.dark,
  );
  // brillo interior de la capa (la separa del fondo)
  poly(
    [
      [-22, 102],
      [-15, 98],
      [-17, 156],
      [-32, 196],
    ],
    p.body,
    0.55,
  );
  g.lineStyle(1.5, p.accent, 0.28);
  g.beginPath();
  g.moveTo(X(-7), 90);
  g.lineTo(X(-10), 156);
  g.lineTo(X(-34), 208);
  g.strokePath();

  /* --- piernas ----------------------------------------------------------- */
  poly(
    [
      [-19, 150],
      [-2, 150],
      [-6, 232],
      [-23, 232],
    ],
    p.dark,
  );
  poly(
    [
      [0, 150],
      [17, 150],
      [23, 230],
      [6, 230],
    ],
    p.body,
  );
  // rodilla
  g.fillStyle(p.light, 0.35);
  g.fillEllipse(X(11), 190, 12, 16);

  /* --- botas ------------------------------------------------------------- */
  g.fillStyle(p.dark, 1);
  g.fillRoundedRect(X(-28), 221, 26, 18, 6);
  g.fillRoundedRect(X(2), 219, 28, 18, 6);
  g.fillStyle(p.accent, 0.5);
  g.fillRect(X(-28), 221, 26, 2.5);
  g.fillRect(X(2), 219, 28, 2.5);

  /* --- torso (con cintura) ----------------------------------------------- */
  poly(
    [
      [-20, 92],
      [20, 92],
      [14, 156],
      [-16, 156],
    ],
    p.body,
  );

  /* placa pectoral */
  poly(
    [
      [-15, 96],
      [16, 96],
      [12, 140],
      [-12, 140],
    ],
    p.light,
    0.95,
  );
  poly(
    [
      [-15, 96],
      [0, 126],
      [16, 96],
    ],
    p.body,
    0.9,
  );

  /* emblema */
  poly(
    [
      [1, 103],
      [7, 115],
      [1, 127],
      [-5, 115],
    ],
    p.accent,
  );

  /* --- cinturón ---------------------------------------------------------- */
  g.fillStyle(p.accent, 0.9);
  g.fillRect(X(-17), 147, 35 * bulk, 7);
  g.fillStyle(p.dark, 0.95);
  g.fillRect(X(-3), 146, 9, 9);

  /* --- brazo que empuña -------------------------------------------------- */
  poly(
    [
      [12, 99],
      [23, 99],
      [30, 136],
      [19, 141],
    ],
    p.light,
    0.95,
  );
  g.lineStyle(1.5, p.dark, 0.5);
  g.strokeCircle(X(25), 139, 5.5);
  g.fillStyle(p.dark, 1);
  g.fillCircle(X(25), 139, 5.5);

  /* --- hombreras --------------------------------------------------------- */
  g.fillStyle(p.light, 1);
  g.fillCircle(X(-20), 98, 12 * bulk);
  g.fillCircle(X(19), 93, 15 * bulk);
  g.lineStyle(2, p.accent, 0.55);
  g.strokeCircle(X(19), 93, 15 * bulk);
  g.strokeCircle(X(-20), 98, 12 * bulk);

  /* --- bufanda / gola (separa cabeza y torso) ---------------------------- */
  poly(
    [
      [-10, 78],
      [11, 78],
      [13, 92],
      [-12, 92],
    ],
    p.dark,
  );
  g.lineStyle(2, p.accent, 0.7);
  g.beginPath();
  g.moveTo(X(-10), 80);
  g.lineTo(X(11), 80);
  g.strokePath();
  poly(
    [
      [-11, 86],
      [-4, 86],
      [-8, 110],
      [-15, 103],
    ],
    p.accent,
    0.28,
  );

  /* --- cabeza ------------------------------------------------------------ */
  g.fillStyle(p.body, 1);
  g.fillCircle(X(2), 61, 15);

  /* cúpula del casco */
  g.fillStyle(p.light, 1);
  g.beginPath();
  g.arc(X(2), 61, 17, Phaser.Math.DegToRad(176), Phaser.Math.DegToRad(364), false, 0.02);
  g.fillPath();

  /* visor encendido */
  g.fillStyle(p.eye, 1);
  g.fillRect(X(2), 57, 13, 4);
  g.fillStyle(p.eye, 0.22);
  g.fillRect(X(2), 54, 13, 11);

  /* --- cresta / adorno --------------------------------------------------- */
  g.fillStyle(p.accent, 0.92);
  switch (crest) {
    case 'blade':
      g.fillPoints([P(X(-8), 47), P(X(-22), 20), P(X(-14), 46), P(X(7), 41)], true);
      break;
    case 'horn':
      g.fillPoints([P(X(-3), 45), P(X(-22), 20), P(X(-17), 44), P(X(4), 43)], true);
      g.fillPoints([P(X(6), 43), P(X(25), 24), P(X(19), 43)], true);
      break;
    case 'halo':
      g.lineStyle(3, p.accent, 0.85);
      g.strokeCircle(X(2), 29, 16);
      g.lineStyle(2, p.accent, 0.28);
      g.strokeCircle(X(2), 29, 23);
      break;
    case 'spike':
      g.fillPoints([P(X(-2), 43), P(X(-28), 3), P(X(2), 33), P(X(24), 5), P(X(10), 43)], true);
      break;
  }

  /* --- luz de contorno (borde frontal) ----------------------------------- */
  g.lineStyle(2.5, p.rim, 0.55);
  g.beginPath();
  g.moveTo(X(20), 96);
  g.lineTo(X(29), 134);
  g.strokePath();

  g.lineStyle(2, p.rim, 0.45);
  g.beginPath();
  g.moveTo(X(22), 226);
  g.lineTo(X(18), 168);
  g.strokePath();

  g.lineStyle(2, p.rim, 0.4);
  g.beginPath();
  g.arc(X(2), 61, 17, Phaser.Math.DegToRad(-78), Phaser.Math.DegToRad(14), false, 0.02);
  g.strokePath();
}

/* -------------------------------------------------------------------------- */
/*  Armas                                                                      */
/* -------------------------------------------------------------------------- */

function drawSword(g: G): void {
  // hoja
  g.fillStyle(0xb9c9dc, 1);
  g.fillPoints([P(11, 4), P(23, 4), P(25, 92), P(17, 120), P(9, 92)], true);
  g.fillStyle(0xffffff, 0.55);
  g.fillPoints([P(15, 8), P(18, 8), P(20, 90), P(17, 110)], true);
  g.fillStyle(0x7f93ab, 1);
  g.fillPoints([P(9, 92), P(11, 4), P(15, 8), P(17, 110)], true);
  // guarnición
  g.fillStyle(0x9fb0c4, 1);
  g.fillRoundedRect(1, 94, 32, 9, 4);
  g.fillStyle(0xe4edf7, 0.85);
  g.fillRoundedRect(1, 94, 32, 3, 2);
  // empuñadura
  g.fillStyle(0x18212e, 1);
  g.fillRoundedRect(14, 102, 6, 30, 2);
  // pomo
  g.fillStyle(0x9fb0c4, 1);
  g.fillCircle(17, 135, 5.5);
}

function drawAxe(g: G): void {
  g.fillStyle(0x2a1d12, 1);
  g.fillRoundedRect(28, 6, 8, 158, 3);
  g.fillStyle(0x8b9cb0, 1);
  g.fillPoints([P(36, 14), P(60, 30), P(57, 74), P(36, 62)], true);
  g.fillStyle(0xe8f1fb, 0.95);
  g.fillPoints([P(36, 14), P(60, 30), P(58, 40), P(36, 26)], true);
  g.fillStyle(0x8b9cb0, 1);
  g.fillPoints([P(28, 20), P(10, 38), P(28, 58)], true);
  g.fillStyle(0xc3d2e4, 0.7);
  g.fillRect(28, 6, 8, 8);
  g.fillStyle(0x3a2a1a, 1);
  g.fillRect(26, 84, 12, 10);
}

function drawSpear(g: G): void {
  g.fillStyle(0x123028, 1);
  g.fillRoundedRect(11, 26, 5, 214, 2);
  g.fillStyle(0xc3d2e4, 0.95);
  g.fillPoints([P(13.5, 0), P(22, 36), P(13.5, 52), P(5, 36)], true);
  g.fillStyle(0xffffff, 0.8);
  g.fillPoints([P(13.5, 4), P(17, 34), P(13.5, 42)], true);
  g.fillStyle(0x2b3a4a, 1);
  g.fillRoundedRect(6, 52, 15, 8, 3);
  g.fillStyle(0xaebfd2, 0.45);
  g.fillRect(11, 26, 5, 214);
}

function drawGreatsword(g: G): void {
  g.fillStyle(0xb6c4d6, 1);
  g.fillPoints([P(12, 4), P(42, 4), P(45, 134), P(27, 166), P(9, 134)], true);
  g.fillStyle(0xffffff, 0.45);
  g.fillPoints([P(18, 10), P(23, 10), P(25, 130), P(21, 146)], true);
  g.fillStyle(0x7c8ca0, 1);
  g.fillPoints([P(9, 134), P(12, 4), P(18, 10), P(21, 146)], true);
  g.fillStyle(0x18212e, 1);
  g.fillRoundedRect(19, 146, 8, 34, 2);
  g.fillStyle(0x9fb0c4, 1);
  g.fillRoundedRect(2, 138, 48, 10, 4);
  g.fillStyle(0xe8f1fb, 0.95);
  g.fillCircle(27, 184, 6.5);
}

/* -------------------------------------------------------------------------- */
/*  Efectos                                                                    */
/* -------------------------------------------------------------------------- */

function drawGlow(scene: Phaser.Scene): void {
  const g = scratch(scene);
  // Muchos pasos con alfa bajo: el degradado no muestra anillos.
  const steps = 40;
  for (let i = steps; i >= 1; i--) {
    g.fillStyle(0xffffff, 0.018);
    g.fillCircle(80, 80, (i / steps) * 78);
  }
  bake(g, TEX.glow, 160, 160);
}

function drawRing(scene: Phaser.Scene, key: string, width: number): void {
  const g = scratch(scene);
  g.lineStyle(width, 0xffffff, 1);
  g.strokeCircle(80, 80, 70);
  bake(g, key, 160, 160);
}

/** Retícula de parry: cuatro arcos + marcas. Se lee como "objetivo", no como burbuja. */
function drawReticle(scene: Phaser.Scene): void {
  const g = scratch(scene);
  const cx = 80;
  const cy = 80;
  const r = 66;

  g.lineStyle(3, 0xffffff, 1);
  for (let i = 0; i < 4; i++) {
    const a0 = Phaser.Math.DegToRad(i * 90 + 16);
    const a1 = Phaser.Math.DegToRad(i * 90 + 74);
    g.beginPath();
    g.arc(cx, cy, r, a0, a1, false, 0.02);
    g.strokePath();
  }

  g.lineStyle(2, 0xffffff, 0.85);
  for (let i = 0; i < 4; i++) {
    const a = Phaser.Math.DegToRad(i * 90);
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * (r + 5), cy + Math.sin(a) * (r + 5));
    g.lineTo(cx + Math.cos(a) * (r + 14), cy + Math.sin(a) * (r + 14));
    g.strokePath();
  }

  bake(g, TEX.reticle, 160, 160);
}

function drawSpark(scene: Phaser.Scene): void {
  const g = scratch(scene);
  g.fillStyle(0xffffff, 1);
  g.fillPoints(
    [P(40, 0), P(46, 34), P(80, 40), P(46, 46), P(40, 80), P(34, 46), P(0, 40), P(34, 34)],
    true,
  );
  g.fillStyle(0xffffff, 0.45);
  g.fillCircle(40, 40, 7);
  bake(g, TEX.spark, 80, 80);
}

/** Media luna: se usa para el "swoosh" del golpe del rival. */
function drawSlash(scene: Phaser.Scene): void {
  const g = scratch(scene);
  const cx = 130;
  const cy = 130;
  const outer = 118;
  const inner = 74;
  const pts: Phaser.Geom.Point[] = [];

  for (let a = -54; a <= 54; a += 3) {
    const t = Phaser.Math.DegToRad(a);
    pts.push(P(cx + outer * Math.sin(t), cy - outer * Math.cos(t)));
  }
  for (let a = 54; a >= -54; a -= 3) {
    const t = Phaser.Math.DegToRad(a);
    pts.push(P(cx + inner * Math.sin(t), cy - inner * Math.cos(t)));
  }

  g.fillStyle(0xffffff, 0.9);
  g.fillPoints(pts, true);
  bake(g, TEX.slash, 260, 260);
}

function drawDust(scene: Phaser.Scene): void {
  const g = scratch(scene);
  for (let i = 8; i >= 1; i--) {
    g.fillStyle(0xffffff, 0.09);
    g.fillCircle(12, 12, (i / 8) * 12);
  }
  bake(g, TEX.dust, 24, 24);
}

function drawShadow(scene: Phaser.Scene): void {
  const g = scratch(scene);
  for (let i = 8; i >= 1; i--) {
    g.fillStyle(0x000000, 0.06);
    g.fillEllipse(90, 22, (i / 8) * 172, (i / 8) * 36);
  }
  bake(g, TEX.shadow, 180, 44);
}

function drawShard(scene: Phaser.Scene): void {
  const g = scratch(scene);
  g.fillStyle(0xffffff, 1);
  g.fillPoints([P(7, 0), P(14, 9), P(7, 18), P(0, 9)], true);
  bake(g, TEX.shard, 14, 18);
}

/* -------------------------------------------------------------------------- */
/*  API pública                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Genera todas las texturas del juego. Es idempotente: si ya existen
 * (por ejemplo tras `scene.restart()`) no vuelve a dibujarlas.
 */
export function buildTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX.glow)) return;

  // Jugador
  const playerG = scratch(scene);
  drawFighter(playerG, PLAYER_PALETTE, 1, 'blade');
  bake(playerG, bodyTextureKey('player'), BODY_W, BODY_H);

  // Rivales
  for (const profile of ENEMY_ROSTER) {
    const g = scratch(scene);
    drawFighter(g, profile.palette, profile.bulk, profile.crest);
    bake(g, bodyTextureKey(profile.key), BODY_W, BODY_H);
  }

  // Armas
  const sword = scratch(scene);
  drawSword(sword);
  bake(sword, TEX.weaponSword, 34, 146);

  const axe = scratch(scene);
  drawAxe(axe);
  bake(axe, TEX.weaponAxe, 64, 168);

  const spear = scratch(scene);
  drawSpear(spear);
  bake(spear, TEX.weaponSpear, 26, 244);

  const great = scratch(scene);
  drawGreatsword(great);
  bake(great, TEX.weaponGreatsword, 54, 194);

  // Efectos
  drawGlow(scene);
  drawRing(scene, TEX.ring, 3);
  drawReticle(scene);
  drawRing(scene, TEX.ringThin, 1.5);
  drawSpark(scene);
  drawSlash(scene);
  drawDust(scene);
  drawShadow(scene);
  drawShard(scene);
}
