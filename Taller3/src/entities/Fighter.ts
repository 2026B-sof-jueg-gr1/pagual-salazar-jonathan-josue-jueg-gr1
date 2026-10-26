import Phaser from 'phaser';
import { TEX } from '../gfx/TextureFactory';

export interface FighterOptions {
  x: number;
  y: number;
  /** 1 mira a la derecha, -1 mira a la izquierda (espeja el contenedor). */
  facing: 1 | -1;
  bodyTexture: string;
  weaponTexture: string;
  accent: number;
  maxHp: number;
  /** Ángulo del arma en reposo (grados; 0 = apuntando arriba). */
  idleWeaponAngle?: number;
}

/**
 * Base común de jugador y rivales.
 *
 * Jerarquía de objetos:
 *   container (posición en el suelo, espejado con scaleX = ±1)
 *     ├─ shadow  (sombra elíptica)
 *     ├─ glow    (aura aditiva para telegrafiar / feedback)
 *     └─ rig     (se anima el "bob" de respiración sin tocar el container)
 *          ├─ body
 *          └─ weapon (pivota sobre la empuñadura)
 *
 * El container queda libre para desplazamientos (embestidas, knockback),
 * mientras que el rig hace las micro-animaciones.
 */
export class Fighter {
  protected readonly scene: Phaser.Scene;

  readonly container: Phaser.GameObjects.Container;
  readonly rig: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Image;
  readonly weapon: Phaser.GameObjects.Image;
  readonly glow: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;

  readonly accent: number;
  readonly facing: 1 | -1;
  readonly idleWeaponAngle: number;

  hp: number;
  maxHp: number;

  /** Posición "de casa" a la que vuelve tras un knockback. */
  protected homeX: number;
  protected homeY: number;

  private bobTween?: Phaser.Tweens.Tween;
  private glowTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, options: FighterOptions) {
    this.scene = scene;
    this.accent = options.accent;
    this.facing = options.facing;
    this.idleWeaponAngle = options.idleWeaponAngle ?? 16;
    this.hp = options.maxHp;
    this.maxHp = options.maxHp;
    this.homeX = options.x;
    this.homeY = options.y;

    this.shadow = scene.add.image(0, 4, TEX.shadow).setAlpha(0.55);
    this.glow = scene.add
      .image(0, -120, TEX.glow)
      .setScale(2.2)
      .setAlpha(0)
      .setTint(options.accent)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.body = scene.add.image(0, 8, options.bodyTexture).setOrigin(0.5, 1);
    this.weapon = scene.add
      .image(26, -102, options.weaponTexture)
      .setOrigin(0.5, 0.88)
      .setAngle(this.idleWeaponAngle);

    this.rig = scene.add.container(0, 0, [this.body, this.weapon]);
    this.container = scene.add.container(options.x, options.y, [this.shadow, this.glow, this.rig]);
    this.container.setScale(options.facing, 1);
    this.container.setDepth(10);

    this.startBreathing();
  }

  /* ---------------------------------------------------------------- */
  /*  Animación base                                                   */
  /* ---------------------------------------------------------------- */

  /** Balanceo sutil de respiración; se detiene al morir. */
  protected startBreathing(): void {
    this.bobTween?.remove();
    this.rig.y = 0;
    this.bobTween = this.scene.tweens.add({
      targets: this.rig,
      y: -3,
      duration: 1500 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  /** Lleva el arma a un ángulo concreto. */
  protected tweenWeapon(angle: number, duration: number, ease = 'Cubic.out', onComplete?: () => void): void {
    this.scene.tweens.killTweensOf(this.weapon);
    this.scene.tweens.add({
      targets: this.weapon,
      angle,
      duration,
      ease,
      onComplete,
    });
  }

  /** Vuelve a la pose de reposo. */
  idlePose(duration = 260): void {
    this.tweenWeapon(this.idleWeaponAngle, duration, 'Sine.out');
  }

  /** Desplazamiento de ida y vuelta que SIEMPRE termina en la posición base. */
  bump(dx: number, duration: number, hold = 40, ease = 'Quad.out'): void {
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.add({
      targets: this.container,
      x: this.homeX + dx,
      duration,
      ease,
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.container,
          x: this.homeX,
          duration: duration * 1.4,
          delay: hold,
          ease: 'Quad.inOut',
        });
      },
    });
  }

  /** Vuelve a la posición base suavemente. */
  resetPosition(duration = 260): void {
    this.scene.tweens.killTweensOf(this.container);
    this.scene.tweens.add({
      targets: this.container,
      x: this.homeX,
      duration,
      ease: 'Quad.out',
    });
  }

  /** Enciende o apaga el aura (con tween). */
  setGlow(alpha: number, scale = 2, duration = 160): void {
    this.glowTween?.remove();
    this.glowTween = this.scene.tweens.add({
      targets: this.glow,
      alpha,
      scale,
      duration,
      ease: 'Quad.out',
    });
  }

  /** Tinte momentáneo sobre el cuerpo (feedback de impacto). */
  flashBody(color: number, duration = 130): void {
    this.body.setTint(color);
    this.scene.time.delayedCall(duration, () => this.body.clearTint());
  }

  /** Punto aproximado del pecho, en coordenadas de mundo. */
  get chestX(): number {
    return this.container.x + this.facing * 18;
  }

  get chestY(): number {
    return this.container.y - 132;
  }

  get isDead(): boolean {
    return this.hp <= 0;
  }

  /** Animación de derrota: cae, gira y se desvanece. */
  playDeath(onComplete?: () => void): void {
    this.bobTween?.remove();
    this.scene.tweens.killTweensOf(this.weapon);
    this.scene.tweens.killTweensOf(this.rig);
    this.setGlow(0, 1, 260);

    this.scene.tweens.add({
      targets: this.weapon,
      angle: this.idleWeaponAngle - 120,
      y: -70,
      duration: 520,
      ease: 'Cubic.out',
    });

    this.scene.tweens.add({
      targets: this.container,
      angle: this.facing * 76,
      y: this.homeY + 12,
      alpha: 0,
      duration: 780,
      ease: 'Cubic.in',
      onComplete: () => onComplete?.(),
    });
  }

  destroy(): void {
    this.bobTween?.remove();
    this.glowTween?.remove();
    this.scene.tweens.killTweensOf(this.container);
    this.container.destroy(true);
  }
}
