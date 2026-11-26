/// <reference types="vite/client" />
import Phaser from 'phaser';
import worldArt from '../../../landing/assets/art/mundo.jpg';
import human from '../../twinus/art/human.png';
import armored from '../../twinus/art/armored.png';
import running from '../../twinus/art/running.png';
import strike from '../../twinus/art/strike.png';
import frenzy from '../../twinus/art/frenzy.png';
import { PLATFORMS, VIEW, WORLD } from './level';

export function loadArt(scene: Phaser.Scene): void {
  for (const [key, src] of Object.entries({ worldArt, human, armored, running, strike, frenzy })) {
    scene.load.image(key, src);
  }
}

/* -------------------------------------------------------------------------- */
/*  Paleta imperial (GDD §6.1): azul profundo, violeta y cian frío            */
/* -------------------------------------------------------------------------- */

const IMP = {
  void: 0x070d16,
  deep: 0x1a2c40,
  shell: 0x2b4a63,
  light: 0x47738f,
  rim: 0x9ad4e2,
  edge: 0x5a86a8,
  plate: 0x6a4d86,
  plateLit: 0x9773b5,
  steel: 0xc2d4e2,
  cyan: 0x65cbd6,
  warm: 0xe2b16d,
} as const;

/* -------------------------------------------------------------------------- */
/*  Mundo                                                                      */
/* -------------------------------------------------------------------------- */

export function drawWorld(scene: Phaser.Scene): void {
  // Capa lejana: la misma lámina, más oscura y con parallax lento (profundidad).
  for (let x = -240; x < WORLD.width; x += 1500) {
    scene.add
      .image(x, 26, 'worldArt')
      .setOrigin(0)
      .setDisplaySize(1501, 701)
      .setScrollFactor(0.2, 0.45)
      .setTint(0x2b4166)
      .setAlpha(0.55)
      .setDepth(-14);
  }

  // Capa principal.
  for (let x = 0; x < WORLD.width; x += 1200) {
    scene.add
      .image(x, 0, 'worldArt')
      .setOrigin(0)
      .setDisplaySize(1201, 701)
      .setScrollFactor(0.43, 0.65)
      .setDepth(-10);
  }

  // Capa de contraste: separa el fondo de personajes, proyectiles y avisos.
  scene.add
    .rectangle(0, 0, VIEW.width, VIEW.height, 0x050912, 0.5)
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(-9);

  // Haces de luz que caen desde la bóveda.
  const beams = scene.add.graphics().setDepth(-8).setBlendMode(Phaser.BlendModes.ADD);
  for (const [x, w] of [
    [220, 150],
    [940, 120],
    [1710, 170],
    [2520, 130],
    [3230, 150],
  ] as const) {
    beams.fillStyle(0x5fd6e6, 0.045);
    beams.fillPoints(
      [
        { x, y: 0 },
        { x: x + w, y: 0 },
        { x: x + w + 190, y: VIEW.height },
        { x: x + 130, y: VIEW.height },
      ],
      true,
    );
  }

  // Columnas imperiales con remate luminoso.
  for (const x of [340, 870, 1580, 2310, 2540, 3090, 3480]) {
    const imperial = x >= 2300;
    const glow = imperial ? 0xf475a7 : 0x56d7df;
    scene.add.rectangle(x, 307, 13, 116, 0x0d1826, 0.92).setDepth(-3);
    scene.add.rectangle(x, 307, 7, 116, imperial ? 0x241a30 : 0x162c3a, 0.9).setDepth(-3);
    scene.add.rectangle(x, 270, 7, 26, glow, 0.7).setDepth(-3);
    scene.add.rectangle(x, 247, 17, 4, glow, 0.55).setDepth(-3);
    scene.add.rectangle(x, 253, 9, 2, 0xffffff, 0.35).setDepth(-3);
  }

  // Terreno transitable: borde claro, bisel y remaches (GDD §6.1).
  const terrain = scene.add.graphics().setDepth(-2);
  for (const { x, y, w, h } of PLATFORMS) {
    const imperial = x >= 2160;
    const body = imperial ? 0x1a1322 : 0x0e1d29;
    const bevel = imperial ? 0x35283f : 0x1a3341;
    const edge = imperial ? 0x8f6a8d : 0x4b8798;
    const glow = imperial ? 0xd08ab4 : 0x6fd9e2;

    terrain.fillStyle(body).fillRect(x, y, w, h);
    terrain.fillStyle(bevel).fillRect(x, y + 3, w, 12);
    terrain.fillStyle(edge).fillRect(x, y, w, 3);
    terrain.fillStyle(glow, 0.45).fillRect(x, y, w, 1);

    for (let offset = 10; offset < w - 12; offset += 34) {
      terrain.fillStyle(edge, 0.3).fillRect(x + offset, y + 7, 15, 2);
    }
    if (h > 30) {
      for (let offset = 26; offset < w - 20; offset += 96) {
        terrain.fillStyle(0x050c14, 0.55).fillRect(x + offset, y + 22, 6, Math.min(h - 24, 72));
      }
      // Vetas orgánicas del imperio.
      if (imperial) {
        terrain.lineStyle(1, 0x71538c, 0.22);
        for (let offset = 48; offset < w - 30; offset += 150) {
          terrain.beginPath();
          terrain.moveTo(x + offset, y + 26);
          terrain.lineTo(x + offset + 22, y + 52);
          terrain.lineTo(x + offset + 14, y + 84);
          terrain.strokePath();
        }
      }
    }
    terrain.fillStyle(0x04080f, 0.35).fillRect(x, y + h - 24, w, 24);
  }

  // Cristales bioluminiscentes en los bordes del camino.
  for (const [cx, cy] of [
    [534, 592],
    [1326, 592],
    [2088, 592],
    [2724, 592],
    [3436, 592],
  ] as const) {
    const imperial = cx >= 2160;
    const color = imperial ? 0xe07fb0 : 0x6fe4ec;
    const crystals = scene.add.graphics().setDepth(-1).setBlendMode(Phaser.BlendModes.ADD);
    crystals.fillStyle(color, 0.13).fillEllipse(cx, cy - 10, 84, 30);
    crystals.fillStyle(color, 0.5).fillTriangle(cx - 16, cy, cx - 5, cy - 34, cx + 2, cy);
    crystals.fillStyle(color, 0.34).fillTriangle(cx + 2, cy, cx + 11, cy - 22, cx + 18, cy);
    crystals.fillStyle(color, 0.22).fillTriangle(cx - 30, cy, cx - 23, cy - 15, cx - 17, cy);
  }
}

/* -------------------------------------------------------------------------- */
/*  Enemigos                                                                   */
/* -------------------------------------------------------------------------- */

export type EnemyKind = 'aggressor' | 'shooter' | 'boss';

export interface EnemyPose {
  kind: EnemyKind;
  facing: number;
  /** Color del núcleo/visor según el estado (idle, telegrafiado, escudo…). */
  accent: number;
  /** Balanceo de piernas (-4..4). */
  stride: number;
  /** Destello blanco al recibir un golpe. */
  recoil: boolean;
  /** Progreso del telegrafiado (0 = quieto, 1 = golpe inminente). */
  windup: number;
  /** Fase de escudo del jefe: el núcleo se vuelve vulnerable. */
  shield: boolean;
  now: number;
}

/**
 * Dibuja un enemigo imperial con silueta legible y placas orgánicas.
 * Origen en los pies (0,0); crece hacia arriba en Y negativa.
 */
export function drawEnemy(art: Phaser.GameObjects.Graphics, pose: EnemyPose): void {
  const g = art.clear();
  g.setScale(pose.facing, 1);

  if (pose.kind === 'boss') drawBoss(g, pose);
  else if (pose.kind === 'shooter') drawShooter(g, pose);
  else drawAggressor(g, pose);

  if (pose.recoil) {
    const box = pose.kind === 'boss' ? [-52, -152, 104, 152] : [-30, -84, 60, 84];
    g.fillStyle(0xffffff, 0.3).fillRect(box[0], box[1], box[2], box[3]);
  }
}

/** Agresor: bajo, ancho y encorvado; cuchilla adelantada y ojo cian. */
function drawAggressor(g: Phaser.GameObjects.Graphics, pose: EnemyPose): void {
  const swing = pose.stride;
  const lean = pose.windup * 3;

  g.fillStyle(0x04070c, 0.6).fillEllipse(0, 0, 62, 12);

  // Piernas separadas: el hueco central mantiene la silueta legible.
  g.fillStyle(IMP.deep).fillRect(-18, -32, 12, 26 - swing * 0.4);
  g.fillStyle(IMP.deep).fillRect(7, -32, 12, 26 + swing * 0.4);
  g.fillStyle(IMP.shell).fillRect(-20, -7 + swing * 0.3, 16, 7);
  g.fillStyle(IMP.shell).fillRect(5, -7 - swing * 0.3, 16, 7);
  g.fillStyle(IMP.rim, 0.6).fillRect(-18, -32, 12, 2);
  g.fillStyle(IMP.rim, 0.6).fillRect(7, -32, 12, 2);

  // Cadera y torso más estrecho que los hombros.
  g.fillStyle(IMP.shell).fillRect(-19, -40, 38, 9);
  g.fillStyle(IMP.rim, 0.3).fillRect(-19, -40, 38, 1.5);
  g.fillStyle(IMP.shell).fillPoints(
    [
      { x: -15, y: -38 },
      { x: 15, y: -38 },
      { x: 20 + lean, y: -64 },
      { x: -11 + lean, y: -66 },
    ],
    true,
  );
  g.fillStyle(IMP.light, 0.55).fillRect(-15, -62, 7, 24);

  // Placa pectoral y respiradero.
  g.fillStyle(IMP.plate).fillRect(-11, -63, 22, 15);
  g.fillStyle(IMP.plateLit, 0.9).fillRect(-11, -63, 22, 2);
  g.fillStyle(pose.accent, 0.92).fillRect(-4, -57, 9, 4);

  // Hombreras más anchas que el torso.
  g.fillStyle(IMP.plate).fillRect(-31, -68, 16, 17);
  g.fillStyle(IMP.plate).fillRect(15, -69, 17, 18);
  g.fillStyle(IMP.plateLit, 0.9).fillRect(-31, -68, 16, 2);
  g.fillStyle(IMP.plateLit, 0.9).fillRect(15, -69, 17, 2);
  g.fillStyle(IMP.deep).fillTriangle(-30, -64, -42, -78, -19, -66);
  g.fillStyle(IMP.deep).fillTriangle(-25, -55, -36, -67, -18, -57);

  // Cuello y cabeza con visor.
  g.fillStyle(IMP.deep).fillRect(-4, -70, 10, 6);
  g.fillStyle(IMP.deep).fillRect(-9, -84, 20, 15);
  g.fillStyle(IMP.shell).fillRect(-9, -84, 20, 3);
  g.fillStyle(IMP.rim, 0.5).fillRect(-9, -84, 20, 1);
  g.fillStyle(IMP.void).fillRect(-7, -78, 16, 6);
  g.fillStyle(pose.accent).fillRect(0, -78, 9, 4);
  g.fillStyle(0xffffff, 0.7).fillRect(6, -78, 3, 2);

  // Brazo trasero.
  g.fillStyle(IMP.deep).fillRect(-28, -58, 9, 16);

  // Brazo y cuchilla (se alza durante el telegrafiado).
  const raise = pose.windup * 16;
  const tipX = 58;
  const tipY = -66 - raise;
  g.fillStyle(IMP.shell).fillRect(16, -62, 10, 16);
  g.fillStyle(IMP.rim, 0.35).fillRect(16, -62, 10, 2);
  g.lineStyle(6, IMP.steel, 1).lineBetween(24, -46, tipX, tipY);
  g.fillStyle(IMP.steel).fillTriangle(tipX - 3, tipY - 5, tipX + 9, tipY, tipX - 3, tipY + 5);
  g.lineStyle(2, pose.accent, 0.9).lineBetween(26, -46, tipX, tipY);
  g.fillStyle(IMP.void).fillRect(19, -48, 7, 5);
}

/** Tirador: alto y delgado, cañón largo y lente única. */
function drawShooter(g: Phaser.GameObjects.Graphics, pose: EnemyPose): void {
  const swing = pose.stride;
  const charge = pose.windup;

  g.fillStyle(0x04070c, 0.6).fillEllipse(0, 0, 58, 12);

  // Piernas largas y separadas.
  g.fillStyle(IMP.deep).fillRect(-14, -44, 9, 38 - swing * 0.4);
  g.fillStyle(IMP.deep).fillRect(5, -44, 9, 38 + swing * 0.4);
  g.fillStyle(IMP.shell).fillRect(-17, -8 + swing * 0.3, 14, 8);
  g.fillStyle(IMP.shell).fillRect(3, -8 - swing * 0.3, 14, 8);
  g.fillStyle(IMP.rim, 0.62).fillRect(-14, -44, 2, 36);
  g.fillStyle(IMP.rim, 0.62).fillRect(5, -44, 2, 36);
  g.fillStyle(IMP.plate).fillRect(-15, -30, 11, 5);
  g.fillStyle(IMP.plate).fillRect(4, -30, 11, 5);

  // Cadera y torso esbelto.
  g.fillStyle(IMP.shell).fillRect(-14, -50, 28, 9);
  g.fillStyle(IMP.rim, 0.3).fillRect(-14, -50, 28, 1.5);
  g.fillStyle(IMP.shell).fillRect(-11, -76, 22, 27);
  g.fillStyle(IMP.light, 0.6).fillRect(-11, -76, 5, 27);
  g.fillStyle(IMP.plate).fillRect(-9, -72, 18, 8);
  g.fillStyle(IMP.plateLit, 0.9).fillRect(-9, -72, 18, 2);
  g.fillStyle(pose.accent, 0.8).fillRect(-3, -66, 7, 3);

  // Mochila y célula de energía.
  g.fillStyle(IMP.deep).fillRect(-23, -74, 10, 26);
  g.fillStyle(IMP.edge, 0.55).fillRect(-23, -74, 10, 2);
  g.fillStyle(pose.accent, 0.5 + charge * 0.45).fillRect(-21, -69, 6, 11);
  g.fillStyle(0xffffff, 0.35 + charge * 0.3).fillRect(-20, -67, 2, 7);

  // Cuello y cabeza con lente grande.
  g.fillStyle(IMP.deep).fillRect(-4, -80, 10, 5);
  g.fillStyle(IMP.deep).fillRect(-9, -96, 21, 17);
  g.fillStyle(IMP.shell).fillRect(-9, -96, 21, 3);
  g.fillStyle(IMP.rim, 0.55).fillRect(-9, -96, 21, 1);
  g.fillStyle(IMP.void).fillRect(-6, -89, 16, 8);
  g.fillStyle(pose.accent, 0.95).fillCircle(3, -85, 4.2);
  g.fillStyle(0xffffff, 0.9).fillCircle(3, -85, 1.5);
  g.fillStyle(IMP.edge).fillRect(10, -108, 2, 13);
  g.fillStyle(pose.accent, 0.7).fillRect(9, -109, 4, 2);

  // Brazo cañón con hombro visible.
  g.fillStyle(IMP.plate).fillRect(8, -76, 12, 12);
  g.fillStyle(IMP.plateLit, 0.9).fillRect(8, -76, 12, 2);
  g.fillStyle(IMP.shell).fillRect(14, -66, 12, 9);
  g.fillStyle(IMP.light).fillRect(24, -65, 24, 8);
  g.fillStyle(IMP.deep).fillRect(46, -64, 10, 7);
  g.fillStyle(pose.accent, 0.6 + charge * 0.4).fillRect(54, -64, 4, 7);
  g.fillStyle(IMP.rim, 0.4).fillRect(24, -65, 24, 1.5);
}

/** Centinela del Umbral: jefe alto, hombreras, aureola y núcleo expuesto. */
function drawBoss(g: Phaser.GameObjects.Graphics, pose: EnemyPose): void {
  const swing = pose.stride * 0.6;
  const y = Math.sin(pose.now / 620) * 1.4;
  const core = pose.shield ? 0x75c5ff : pose.accent;

  g.fillStyle(0x04070c, 0.65).fillEllipse(0, 0, 94, 16);

  // Aureola detrás de la cabeza.
  g.lineStyle(4, IMP.plate, 0.55).strokeCircle(0, -120 + y, 27);
  g.lineStyle(2, IMP.cyan, 0.45).strokeCircle(0, -120 + y, 33);

  // Capa orgánica.
  g.fillStyle(IMP.plate, 0.42).fillPoints(
    [
      { x: -30, y: -110 + y },
      { x: -50, y: -52 },
      { x: -36, y: -14 },
      { x: -14, y: -62 },
    ],
    true,
  );

  // Piernas gruesas con hueco central.
  g.fillStyle(IMP.deep).fillRect(-25, -52, 18, 46 - swing * 0.4);
  g.fillStyle(IMP.deep).fillRect(9, -52, 18, 46 + swing * 0.4);
  g.fillStyle(IMP.rim, 0.5).fillRect(-25, -52, 18, 2);
  g.fillStyle(IMP.rim, 0.5).fillRect(9, -52, 18, 2);
  g.fillStyle(IMP.shell).fillRect(-29, -10 + swing * 0.3, 24, 10);
  g.fillStyle(IMP.shell).fillRect(7, -10 - swing * 0.3, 24, 10);
  g.fillStyle(IMP.plate).fillRect(-29, -10 + swing * 0.3, 24, 2);

  // Cadera.
  g.fillStyle(IMP.shell).fillRect(-28, -62, 56, 12);
  g.fillStyle(IMP.rim, 0.3).fillRect(-28, -62, 56, 1.5);

  // Torso más estrecho que las hombreras.
  g.fillStyle(IMP.shell).fillPoints(
    [
      { x: -24, y: -60 },
      { x: 24, y: -60 },
      { x: 20, y: -108 + y },
      { x: -20, y: -108 + y },
    ],
    true,
  );
  g.fillStyle(IMP.light, 0.5).fillRect(-20, -106 + y, 8, 46);
  g.fillStyle(IMP.plate).fillRect(-18, -104 + y, 36, 16);
  g.fillStyle(IMP.plateLit, 0.9).fillRect(-18, -104 + y, 36, 2);
  g.fillStyle(IMP.deep).fillRect(-18, -84 + y, 36, 9);

  // Núcleo.
  g.fillStyle(core, 0.2).fillCircle(0, -86 + y, 19);
  g.fillStyle(core, 0.9).fillCircle(0, -86 + y, 8);
  g.fillStyle(0xffffff, 0.8).fillCircle(0, -86 + y, 3);

  // Hombreras con púas.
  g.fillStyle(IMP.plate).fillRect(-46, -114 + y, 20, 22);
  g.fillStyle(IMP.plate).fillRect(26, -114 + y, 20, 22);
  g.fillStyle(IMP.plateLit, 0.95).fillRect(-46, -114 + y, 20, 2.5);
  g.fillStyle(IMP.plateLit, 0.95).fillRect(26, -114 + y, 20, 2.5);
  g.fillStyle(IMP.deep).fillTriangle(-46, -108 + y, -60, -128 + y, -32, -110 + y);
  g.fillStyle(IMP.deep).fillTriangle(46, -108 + y, 60, -128 + y, 32, -110 + y);

  // Cuello y cabeza con cresta.
  g.fillStyle(IMP.deep).fillRect(-6, -112 + y, 12, 6);
  g.fillStyle(IMP.deep).fillRect(-12, -132 + y, 24, 20);
  g.fillStyle(IMP.shell).fillRect(-12, -132 + y, 24, 3);
  g.fillStyle(IMP.rim, 0.55).fillRect(-12, -132 + y, 24, 1);
  g.fillStyle(IMP.void).fillRect(-9, -126 + y, 18, 6);
  g.fillStyle(core).fillRect(-4, -126 + y, 9, 5);
  g.fillStyle(0xffffff, 0.7).fillRect(3, -126 + y, 3, 2);
  g.fillStyle(IMP.plate).fillRect(-14, -136 + y, 28, 5);
  g.fillStyle(IMP.plateLit).fillTriangle(-2, -136 + y, 2, -150 + y, 6, -136 + y);

  // Brazo trasero.
  g.fillStyle(IMP.deep).fillRect(-42, -104 + y, 13, 30);
  g.fillStyle(IMP.rim, 0.25).fillRect(-42, -104 + y, 13, 2);

  // Brazo con mandoble (se alza durante el telegrafiado).
  const raise = pose.windup * 22;
  g.fillStyle(IMP.shell).fillRect(28, -108 + y, 14, 32);
  g.fillStyle(IMP.rim, 0.3).fillRect(28, -108 + y, 14, 2);
  g.fillStyle(IMP.plate).fillRect(27, -108 + y, 16, 7);
  g.lineStyle(9, IMP.steel, 1).lineBetween(40, -78 + y, 76, -112 - raise + y);
  g.fillStyle(IMP.steel).fillTriangle(72, -118 - raise + y, 86, -110 - raise + y, 72, -104 - raise + y);
  g.lineStyle(3, core, 0.9).lineBetween(42, -80 + y, 76, -112 - raise + y);
}
