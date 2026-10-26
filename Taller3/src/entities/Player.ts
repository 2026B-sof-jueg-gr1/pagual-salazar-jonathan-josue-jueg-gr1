import Phaser from 'phaser';
import { Fighter } from './Fighter';
import { BALANCE, PLAYER_PALETTE } from '../config/GameConfig';
import { bodyTextureKey, weaponTextureKey } from '../gfx/TextureFactory';

/**
 * El jugador. No ataca: su única acción es el PARRY.
 *
 * Además de la animación, gestiona el "lockout" que castiga pulsar fuera de
 * la ventana (anti-spam).
 */
export class Player extends Fighter {
  private lockoutUntil = 0;
  private alive = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, {
      x,
      y,
      facing: 1,
      bodyTexture: bodyTextureKey('player'),
      weaponTexture: weaponTextureKey('sword'),
      accent: PLAYER_PALETTE.accent,
      maxHp: BALANCE.PLAYER_MAX_HP,
      idleWeaponAngle: 18,
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Acción: parry                                                    */
  /* ---------------------------------------------------------------- */

  /** Animación de desvío: el filo barre hacia delante con un destello. */
  playParry(): void {
    this.scene.tweens.killTweensOf(this.weapon);
    this.weapon.setAngle(-54);
    this.scene.tweens.add({
      targets: this.weapon,
      angle: 46,
      duration: 105,
      ease: 'Cubic.out',
      onComplete: () => this.idlePose(240),
    });

    this.scene.tweens.killTweensOf(this.container);
    this.bump(18, 85, 0, 'Quad.out');

    this.setGlow(0.85, 1.5, 70);
    this.scene.time.delayedCall(160, () => this.setGlow(0, 1.9, 260));
  }

  /** Animación de intento fallido: pequeño retroceso, sin destello. */
  playWhiff(): void {
    this.scene.tweens.killTweensOf(this.weapon);
    this.scene.tweens.add({
      targets: this.weapon,
      angle: this.idleWeaponAngle - 22,
      duration: 90,
      yoyo: true,
      ease: 'Quad.out',
    });
    this.bump(-6, 70, 0, 'Quad.out');
  }

  /* ---------------------------------------------------------------- */
  /*  Castigo por fallar                                               */
  /* ---------------------------------------------------------------- */

  /** Bloquea el parry durante `ms` milisegundos. */
  lockFor(ms: number): void {
    this.lockoutUntil = Math.max(this.lockoutUntil, this.scene.time.now + ms);
  }

  isLockedOut(now: number): boolean {
    return now < this.lockoutUntil;
  }

  /** Progreso 0..1 del bloqueo, para el HUD. */
  lockoutProgress(now: number): number {
    const remaining = this.lockoutUntil - now;
    if (remaining <= 0) return 0;
    return Phaser.Math.Clamp(remaining / BALANCE.FAILED_PARRY_LOCKOUT, 0, 1);
  }

  /* ---------------------------------------------------------------- */
  /*  Vida                                                             */
  /* ---------------------------------------------------------------- */

  /** Aplica daño. Devuelve `true` si el jugador ha caído. */
  takeDamage(amount: number): boolean {
    if (!this.alive) return true;

    this.hp = Math.max(0, this.hp - amount);
    this.flashBody(0xff5a5a, 160);

    this.scene.tweens.killTweensOf(this.weapon);
    this.scene.tweens.add({
      targets: this.weapon,
      angle: this.idleWeaponAngle - 40,
      duration: 110,
      yoyo: true,
      ease: 'Quad.out',
    });
    this.bump(-16, 190);

    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  /** Curación al superar una oleada (nunca por encima del máximo). */
  heal(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.setGlow(0.5, 1.6, 140);
    this.scene.time.delayedCall(200, () => this.setGlow(0, 1.9, 320));
  }

  override playDeath(onComplete?: () => void): void {
    this.alive = false;
    super.playDeath(onComplete);
  }

  get isAlive(): boolean {
    return this.alive;
  }
}
