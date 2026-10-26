import Phaser from 'phaser';
import { COLORS, FONT } from './theme';

export interface HealthBarOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Hacia dónde crece la barra. */
  align: 'left' | 'right';
  /** Color de la barra llena. */
  color: number;
  label: string;
}

/**
 * Barra de vida con dos capas:
 *  - `main`: la vida real (responde rápido).
 *  - `chip`: un "fantasma" claro que se vacía más lento y deja ver el daño
 *            recién recibido (lectura instantánea del golpe).
 */
export class HealthBar {
  private readonly scene: Phaser.Scene;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly valueText: Phaser.GameObjects.Text;

  private readonly x: number;
  private readonly y: number;
  private readonly w: number;
  private readonly h: number;
  private readonly align: 'left' | 'right';
  private color: number;

  private readonly anim = { main: 1, chip: 1 };

  max = 100;
  value = 100;

  constructor(scene: Phaser.Scene, options: HealthBarOptions) {
    this.scene = scene;
    this.x = options.x;
    this.y = options.y;
    this.w = options.width;
    this.h = options.height;
    this.align = options.align;
    this.color = options.color;

    const isLeft = options.align === 'left';
    const originX = isLeft ? 0 : 1;

    this.g = scene.add.graphics().setDepth(100);

    this.labelText = scene.add
      .text(isLeft ? options.x : options.x + options.width, options.y - 20, options.label, {
        fontFamily: FONT.ui,
        fontSize: '15px',
        color: COLORS.dim,
        fontStyle: 'bold',
      })
      .setOrigin(originX, 0.5)
      .setDepth(101);

    this.valueText = scene.add
      .text(isLeft ? options.x + options.width : options.x, options.y - 20, '', {
        fontFamily: FONT.ui,
        fontSize: '15px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(isLeft ? 1 : 0, 0.5)
      .setDepth(101);

    this.draw();
  }

  setMax(max: number, refill = true): void {
    this.max = max;
    if (refill) {
      this.value = max;
      this.anim.main = 1;
      this.anim.chip = 1;
      this.scene.tweens.killTweensOf(this.anim);
      this.draw();
    }
  }

  /** Actualiza el valor con animación de drenado. */
  setValue(value: number): void {
    this.value = Phaser.Math.Clamp(value, 0, this.max);
    const target = this.max > 0 ? this.value / this.max : 0;

    this.scene.tweens.killTweensOf(this.anim);
    this.scene.tweens.add({
      targets: this.anim,
      main: target,
      duration: 170,
      ease: 'Quad.out',
      onUpdate: () => this.draw(),
    });
    this.scene.tweens.add({
      targets: this.anim,
      chip: target,
      duration: 620,
      delay: 130,
      ease: 'Quad.inOut',
      onUpdate: () => this.draw(),
    });
  }

  setLabel(label: string): void {
    this.labelText.setText(label);
  }

  /** Color de acento (por ejemplo, para "telegrafiar" el peligro). */
  setColor(color: number): void {
    this.color = color;
    this.draw();
  }

  private fillBar(g: Phaser.GameObjects.Graphics, ratio: number): void {
    const width = this.w * Phaser.Math.Clamp(ratio, 0, 1);
    if (width <= 1) return;

    const bx = this.align === 'left' ? this.x : this.x + this.w - width;
    const radius = Math.min(this.h / 2, width / 2);
    g.fillRoundedRect(bx, this.y, width, this.h, radius);
  }

  private draw(): void {
    const g = this.g;
    const r = this.h / 2;

    g.clear();

    // Marco exterior
    g.fillStyle(0x05060c, 0.9);
    g.fillRoundedRect(this.x - 4, this.y - 4, this.w + 8, this.h + 8, r + 4);
    g.lineStyle(1.5, 0x3b4266, 0.9);
    g.strokeRoundedRect(this.x - 4, this.y - 4, this.w + 8, this.h + 8, r + 4);

    // Fondo
    g.fillStyle(0x111524, 1);
    g.fillRoundedRect(this.x, this.y, this.w, this.h, r);

    // Capa "chip" (daño reciente)
    g.fillStyle(0xffffff, 0.5);
    this.fillBar(g, this.anim.chip);

    // Capa principal
    g.fillStyle(this.color, 1);
    this.fillBar(g, this.anim.main);

    // Brillo superior
    const mainW = this.w * this.anim.main;
    if (mainW > 6) {
      const bx = this.align === 'left' ? this.x : this.x + this.w - mainW;
      g.fillStyle(0xffffff, 0.22);
      g.fillRoundedRect(bx + 2, this.y + 2, Math.max(mainW - 4, 2), this.h * 0.34, 3);
    }

    // Marcas cada 25%
    g.lineStyle(1, 0x000000, 0.35);
    for (let i = 1; i < 4; i++) {
      const mx = this.x + (this.w * i) / 4;
      g.beginPath();
      g.moveTo(mx, this.y + 2);
      g.lineTo(mx, this.y + this.h - 2);
      g.strokePath();
    }

    this.valueText.setText(`${Math.ceil(this.value)} / ${this.max}`);
  }

  setVisible(visible: boolean): void {
    this.g.setVisible(visible);
    this.labelText.setVisible(visible);
    this.valueText.setVisible(visible);
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.anim);
    this.g.destroy();
    this.labelText.destroy();
    this.valueText.destroy();
  }
}
