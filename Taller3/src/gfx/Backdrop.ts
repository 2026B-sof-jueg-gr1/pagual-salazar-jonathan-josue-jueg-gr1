import Phaser from 'phaser';
import { VIEW } from '../config/GameConfig';
import { TEX } from './TextureFactory';

/** Interpolación lineal de color 0xRRGGBB. */
function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

/**
 * Escenario estático de duelo: cielo nocturno con degradado, luna, ruinas
 * lejanas, suelo con reflejo y brasas flotantes.
 *
 * Todo se dibuja una sola vez al crear la escena (Graphics estático), salvo
 * las brasas, que son sprites con tweens en bucle.
 */
export function buildBackdrop(scene: Phaser.Scene): void {
  const W = VIEW.WIDTH;
  const H = VIEW.HEIGHT;
  const G = VIEW.GROUND_Y;

  const g = scene.add.graphics().setDepth(-100);

  /* --- cielo: degradado en franjas -------------------------------------- */
  const strip = 6;
  for (let y = 0; y < G; y += strip) {
    const t = y / G;
    const color =
      t < 0.55 ? lerpColor(0x05060e, 0x1b1132, t / 0.55) : lerpColor(0x1b1132, 0x3a1d47, (t - 0.55) / 0.45);
    g.fillStyle(color, 1);
    g.fillRect(0, y, W, strip + 1);
  }

  /* --- luna (centrada: enmarca el duelo) -------------------------------- */
  const MX = 714;
  const MY = 150;
  for (let i = 0; i < 34; i++) {
    g.fillStyle(0xffe9c9, 0.0055);
    g.fillCircle(MX, MY, 200 - (i / 33) * 132);
  }
  g.fillStyle(0xfff6e8, 0.6);
  g.fillCircle(MX, MY, 66);
  // cráteres suaves
  g.fillStyle(0xc9b394, 0.22);
  g.fillCircle(MX - 24, MY - 22, 13);
  g.fillCircle(MX + 22, MY + 18, 9);
  g.fillCircle(MX + 6, MY - 34, 6);
  g.fillCircle(MX - 14, MY + 30, 5);

  /* --- estrellas -------------------------------------------------------- */
  for (let i = 0; i < 130; i++) {
    const x = Math.random() * W;
    const y = Math.random() * (G - 150);
    const r = Math.random() * 1.3 + 0.35;
    const a = 0.1 + Math.random() * 0.6;
    g.fillStyle(0xd9e6ff, a);
    g.fillCircle(x, y, r);
  }

  /* --- montañas lejanas (dos capas, hasta el suelo) --------------------- */
  const ridge = (baseY: number, height: number, color: number, seed: number): void => {
    const pts: Phaser.Geom.Point[] = [new Phaser.Geom.Point(-40, baseY)];
    const step = 86;
    for (let x = -40, i = 0; x <= W + 90; x += step, i++) {
      const n = Math.sin(seed + i * 1.7) * 0.5 + Math.sin(seed * 2 + i * 0.6) * 0.5;
      pts.push(new Phaser.Geom.Point(x, baseY - height * (0.3 + Math.abs(n) * 0.7)));
    }
    pts.push(new Phaser.Geom.Point(W + 90, baseY));
    // cerrar por debajo del horizonte para que no aparezca un borde recto
    pts.push(new Phaser.Geom.Point(W + 90, G + 8));
    pts.push(new Phaser.Geom.Point(-40, G + 8));
    g.fillStyle(color, 1);
    g.fillPoints(pts, true);
  };

  ridge(G - 26, 152, 0x120d24, 1.2);
  ridge(G - 4, 92, 0x0a0716, 3.9);

  /* --- ruinas: columnas rotas a los lados ------------------------------- */
  const column = (x: number, w: number, h: number): void => {
    g.fillStyle(0x08060f, 1);
    g.fillRect(x, G - h, w, h);
    g.fillRect(x - 9, G - h, w + 18, 13);
    g.fillRect(x - 5, G - h + 24, w + 10, 7);
    // capitel roto
    g.fillRect(x - 12, G - h - 8, w + 24, 8);
    // luz de luna en el borde
    g.fillStyle(0x6c5f9c, 0.12);
    g.fillRect(x + w - 3, G - h, 3, h);
  };
  column(64, 30, 236);
  column(1196, 34, 284);

  /* --- resplandor del horizonte ----------------------------------------- */
  for (let i = 0; i < 16; i++) {
    g.fillStyle(0xff9a6a, 0.008 + i * 0.0012);
    g.fillRect(0, G - 4 - i * 5, W, 5);
  }

  /* --- suelo ------------------------------------------------------------ */
  g.fillStyle(0x06060e, 1);
  g.fillRect(0, G, W, H - G);

  // degradado del suelo (más claro junto al horizonte)
  for (let i = 0; i < 26; i++) {
    g.fillStyle(0x2a1c3f, 0.1 - i * 0.0037);
    g.fillRect(0, G + i * 6, W, 6);
  }

  // marca circular de la arena
  g.lineStyle(2, 0x7f6bb8, 0.1);
  g.strokeEllipse(W / 2, G + 92, 900, 210);
  g.lineStyle(1, 0x7f6bb8, 0.06);
  g.strokeEllipse(W / 2, G + 92, 1040, 260);

  // línea de horizonte
  g.lineStyle(2, 0x4a4076, 0.6);
  g.beginPath();
  g.moveTo(0, G);
  g.lineTo(W, G);
  g.strokePath();

  g.lineStyle(1, 0x9b8ada, 0.18);
  g.beginPath();
  g.moveTo(0, G + 5);
  g.lineTo(W, G + 5);
  g.strokePath();

  /* --- niebla baja ------------------------------------------------------ */
  for (let i = 0; i < 10; i++) {
    g.fillStyle(0x9fb4ff, 0.014);
    g.fillEllipse(Math.random() * W, G + 14 + Math.random() * 26, 440 + Math.random() * 340, 30);
  }

  /* --- piedras sueltas -------------------------------------------------- */
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * W;
    const y = G + 12 + Math.random() * 90;
    const rw = 4 + Math.random() * 12;
    g.fillStyle(0x0d0b18, 0.9);
    g.fillEllipse(x, y, rw, rw * 0.45);
  }

  /* --- viñeta ----------------------------------------------------------- */
  const vignette = scene.add.graphics().setDepth(-80);
  for (let i = 0; i < 30; i++) {
    const a = 0.012 + i * 0.0018;
    vignette.fillStyle(0x000000, a);
    vignette.fillRect(0, i * 6, W, 6);
    vignette.fillRect(0, H - (i + 1) * 6, W, 6);
    vignette.fillRect(i * 11, 0, 11, H);
    vignette.fillRect(W - (i + 1) * 11, 0, 11, H);
  }

  /* --- charcos de luz bajo los combatientes ----------------------------- */
  const pool = (x: number, tint: number, alpha: number): void => {
    scene.add
      .image(x, G + 6, TEX.glow)
      .setDepth(-70)
      .setTint(tint)
      .setAlpha(alpha)
      .setScale(2.6, 0.62)
      .setBlendMode(Phaser.BlendModes.ADD);
  };
  pool(300, 0x46e3c8, 0.22);
  pool(992, 0xff8a6a, 0.18);

  /* --- brasas flotantes ------------------------------------------------- */
  for (let i = 0; i < 26; i++) {
    const startX = Math.random() * W;
    const startY = G - 40 + Math.random() * 120;
    const ember = scene.add
      .image(startX, startY, TEX.dust)
      .setDepth(-90)
      .setTint(0xffb066)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.25 + Math.random() * 0.55)
      .setAlpha(0.1 + Math.random() * 0.3);

    scene.tweens.add({
      targets: ember,
      y: startY - 220 - Math.random() * 220,
      x: startX + (Math.random() * 120 - 60),
      alpha: 0,
      duration: 5200 + Math.random() * 4200,
      delay: Math.random() * 4200,
      repeat: -1,
      ease: 'Sine.inOut',
      onRepeat: () => {
        ember.y = G - 20 + Math.random() * 120;
        ember.x = Math.random() * W;
        ember.setAlpha(0.1 + Math.random() * 0.3);
      },
    });
  }
}
