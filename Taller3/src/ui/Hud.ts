import Phaser from 'phaser';
import { VIEW } from '../config/GameConfig';
import { TEX } from '../gfx/TextureFactory';
import { COLORS, FONT } from './theme';
import type { RunStats } from '../types';

/**
 * Toda la interfaz superpuesta: marcador, avisos centrales, pantalla de
 * inicio y pantalla de derrota.
 */
export class Hud {
  private readonly scene: Phaser.Scene;

  private readonly waveText: Phaser.GameObjects.Text;
  private readonly comboText: Phaser.GameObjects.Text;
  private readonly hintText: Phaser.GameObjects.Text;
  private readonly bannerText: Phaser.GameObjects.Text;
  private readonly bannerSub: Phaser.GameObjects.Text;

  private titleLayer?: Phaser.GameObjects.Container;
  private gameOverLayer?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.waveText = scene.add
      .text(VIEW.WIDTH / 2, 34, '', {
        fontFamily: FONT.title,
        fontSize: '22px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(110)
      .setAlpha(0.92);

    this.comboText = scene.add
      .text(VIEW.WIDTH / 2, 64, '', {
        fontFamily: FONT.ui,
        fontSize: '17px',
        color: COLORS.playerText,
      })
      .setOrigin(0.5)
      .setDepth(110)
      .setAlpha(0);

    this.hintText = scene.add
      .text(VIEW.WIDTH / 2, VIEW.HEIGHT - 26, '[ E ]  ·  CLIC IZQUIERDO   →   PARRY', {
        fontFamily: FONT.ui,
        fontSize: '16px',
        color: COLORS.dim,
      })
      .setOrigin(0.5)
      .setDepth(110)
      .setAlpha(0.55);

    this.bannerText = scene.add
      .text(VIEW.WIDTH / 2, 208, '', {
        fontFamily: FONT.title,
        fontSize: '46px',
        color: COLORS.text,
        fontStyle: 'bold',
        stroke: '#05060c',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(150)
      .setAlpha(0);

    this.bannerSub = scene.add
      .text(VIEW.WIDTH / 2, 248, '', {
        fontFamily: FONT.ui,
        fontSize: '18px',
        color: COLORS.dim,
        stroke: '#05060c',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(150)
      .setAlpha(0);
  }

  /* ------------------------------------------------------------------ */
  /*  Marcador                                                           */
  /* ------------------------------------------------------------------ */

  setWave(n: number): void {
    this.waveText.setText(`OLEADA ${n.toString().padStart(2, '0')}`);
  }

  setCombo(n: number): void {
    if (n <= 0) {
      this.comboText.setAlpha(0);
      return;
    }
    this.comboText.setText(`PARRYS SEGUIDOS  ×${n}`);
    this.comboText.setAlpha(1).setScale(1.25);
    this.scene.tweens.add({
      targets: this.comboText,
      scale: 1,
      duration: 220,
      ease: 'Back.out',
    });
  }

  setHint(text: string): void {
    this.hintText.setText(text);
  }

  /** Muestra u oculta el marcador (se oculta en la pantalla de título). */
  setHudVisible(visible: boolean): void {
    this.waveText.setVisible(visible);
    this.hintText.setVisible(visible);
    if (!visible) this.comboText.setAlpha(0);
  }

  /** Destello rojo del recordatorio inferior cuando el parry está bloqueado. */
  pulseLockout(): void {
    this.hintText.setColor(COLORS.dangerText).setAlpha(0.95);
    this.scene.tweens.add({
      targets: this.hintText,
      alpha: 0.55,
      duration: 260,
      onComplete: () => this.hintText.setColor(COLORS.dim),
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Avisos                                                             */
  /* ------------------------------------------------------------------ */

  /** Cartel central grande con subtítulo (entrada de rival, oleada superada…). */
  announce(main: string, sub: string, color: string = COLORS.text): void {
    this.scene.tweens.killTweensOf([this.bannerText, this.bannerSub]);

    this.bannerText.setText(main).setColor(color).setAlpha(1).setScale(0.86);
    this.bannerSub.setText(sub).setAlpha(0.9);

    this.scene.tweens.add({
      targets: this.bannerText,
      scale: 1,
      duration: 340,
      ease: 'Back.out',
    });
    this.scene.tweens.add({
      targets: [this.bannerText, this.bannerSub],
      alpha: 0,
      delay: 1150,
      duration: 520,
      ease: 'Quad.in',
    });
  }

  /** Texto flotante efímero (feedback de golpe). */
  popText(x: number, y: number, message: string, color: string, size = 26): void {
    const text = this.scene.add
      .text(x, y, message, {
        fontFamily: FONT.title,
        fontSize: `${size}px`,
        color,
        fontStyle: 'bold',
        stroke: '#05060c',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(160)
      .setScale(0.7);

    this.scene.tweens.add({
      targets: text,
      scale: 1,
      duration: 160,
      ease: 'Back.out',
    });
    this.scene.tweens.add({
      targets: text,
      y: y - 56,
      alpha: 0,
      delay: 140,
      duration: 560,
      ease: 'Quad.out',
      onComplete: () => text.destroy(),
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Pantalla de inicio                                                 */
  /* ------------------------------------------------------------------ */

  showTitle(): void {
    if (this.titleLayer) return;

    const cx = VIEW.WIDTH / 2;
    const cy = VIEW.HEIGHT / 2;

    const scrim = this.scene.add.rectangle(cx, cy, VIEW.WIDTH, VIEW.HEIGHT, 0x04050a, 0.62);

    const glow = this.scene.add
      .image(cx, cy - 130, TEX.glow)
      .setScale(5.4, 2.4)
      .setTint(COLORS.player)
      .setAlpha(0.16)
      .setBlendMode(Phaser.BlendModes.ADD);

    const title = this.scene.add
      .text(cx, cy - 150, 'PARRY', {
        fontFamily: FONT.title,
        fontSize: '112px',
        color: '#f2fbff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const rule = this.scene.add.rectangle(cx, cy - 74, 320, 2, COLORS.player, 0.7);

    const subtitle = this.scene.add
      .text(cx, cy - 46, 'D U E L O   D E   R E A C C I Ó N', {
        fontFamily: FONT.ui,
        fontSize: '19px',
        color: COLORS.playerText,
      })
      .setOrigin(0.5);

    const body = this.scene.add
      .text(
        cx,
        cy + 46,
        'Desvía el golpe en el instante exacto.\nSi te adelantas, quedas bloqueado y el filo te alcanza.',
        {
          fontFamily: FONT.ui,
          fontSize: '20px',
          color: COLORS.dim,
          align: 'center',
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5);

    const controls = this.scene.add
      .text(cx, cy + 128, '[ E ]        CLIC IZQUIERDO', {
        fontFamily: FONT.ui,
        fontSize: '24px',
        color: COLORS.text,
        align: 'center',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const start = this.scene.add
      .text(cx, cy + 196, 'CLIC O PULSA [ E ] PARA EMPEZAR', {
        fontFamily: FONT.ui,
        fontSize: '17px',
        color: COLORS.goldText,
      })
      .setOrigin(0.5);

    this.scene.tweens.add({
      targets: start,
      alpha: 0.25,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    this.titleLayer = this.scene.add
      .container(0, 0, [scrim, glow, title, rule, subtitle, body, controls, start])
      .setDepth(200);
  }

  hideTitle(): void {
    if (!this.titleLayer) return;
    const layer = this.titleLayer;
    this.titleLayer = undefined;
    this.scene.tweens.add({
      targets: layer,
      alpha: 0,
      duration: 340,
      ease: 'Quad.in',
      onComplete: () => layer.destroy(true),
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Pantalla de derrota                                                */
  /* ------------------------------------------------------------------ */

  showGameOver(stats: RunStats): void {
    if (this.gameOverLayer) return;

    const cx = VIEW.WIDTH / 2;
    const cy = VIEW.HEIGHT / 2;

    const scrim = this.scene.add.rectangle(cx, cy, VIEW.WIDTH, VIEW.HEIGHT, 0x03040a, 0.82);

    const panel = this.scene.add.graphics();
    panel.fillStyle(0x0b0e18, 0.96);
    panel.fillRoundedRect(cx - 290, cy - 210, 580, 420, 14);
    panel.lineStyle(2, 0x2b3350, 1);
    panel.strokeRoundedRect(cx - 290, cy - 210, 580, 420, 14);
    panel.lineStyle(2, COLORS.danger, 0.45);
    panel.beginPath();
    panel.moveTo(cx - 250, cy - 108);
    panel.lineTo(cx + 250, cy - 108);
    panel.strokePath();

    const title = this.scene.add
      .text(cx, cy - 164, 'DERROTA', {
        fontFamily: FONT.title,
        fontSize: '56px',
        color: COLORS.dangerText,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const rows: Array<[string, string]> = [
      ['RIVALES DERROTADOS', `${stats.enemiesDefeated}`],
      ['MEJOR CADENA DE PARRYS', `×${stats.bestCombo}`],
      ['PARRYS PERFECTOS', `${stats.perfects}`],
      ['PARRYS TOTALES', `${stats.totalParries}`],
    ];

    const items: Phaser.GameObjects.GameObject[] = [scrim, panel, title];

    rows.forEach(([label, value], i) => {
      const y = cy - 60 + i * 52;
      items.push(
        this.scene.add
          .text(cx - 232, y, label, {
            fontFamily: FONT.ui,
            fontSize: '18px',
            color: COLORS.dim,
          })
          .setOrigin(0, 0.5),
      );
      items.push(
        this.scene.add
          .text(cx + 232, y, value, {
            fontFamily: FONT.ui,
            fontSize: '24px',
            color: COLORS.text,
            fontStyle: 'bold',
          })
          .setOrigin(1, 0.5),
      );
    });

    const restart = this.scene.add
      .text(cx, cy + 164, 'CLIC O [ R ] PARA REINICIAR', {
        fontFamily: FONT.ui,
        fontSize: '18px',
        color: COLORS.goldText,
      })
      .setOrigin(0.5);
    items.push(restart);

    this.scene.tweens.add({
      targets: restart,
      alpha: 0.3,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    this.gameOverLayer = this.scene.add.container(0, 0, items).setDepth(210).setAlpha(0);
    this.scene.tweens.add({
      targets: this.gameOverLayer,
      alpha: 1,
      duration: 420,
      ease: 'Quad.out',
    });
  }

  destroy(): void {
    this.waveText.destroy();
    this.comboText.destroy();
    this.hintText.destroy();
    this.bannerText.destroy();
    this.bannerSub.destroy();
    this.titleLayer?.destroy(true);
    this.gameOverLayer?.destroy(true);
  }
}
