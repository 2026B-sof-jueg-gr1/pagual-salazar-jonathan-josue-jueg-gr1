import Phaser from 'phaser';
import { Fighter } from './Fighter';
import { BALANCE } from '../config/GameConfig';
import { CombatStateMachine, type StateMap } from '../core/CombatStateMachine';
import { bodyTextureKey, weaponTextureKey } from '../gfx/TextureFactory';
import { CombatState, type EnemyProfile } from '../types';

export interface EnemyCallbacks {
  /** La ventana de parry acaba de abrirse (para el aviso visual/sonoro). */
  onWindowOpen?: (enemy: Enemy) => void;
  /** El rival ha soltado el golpe (swoosh). */
  onSlash?: (enemy: Enemy) => void;
  /** El golpe conecta: el jugador debe recibir daño. */
  onLand?: (damage: number, enemy: Enemy) => void;
  /** El rival ha sido desviado con éxito. */
  onParried?: (damage: number, perfect: boolean, enemy: Enemy) => void;
  /** La vida del rival llega a 0. */
  onDefeated?: (enemy: Enemy) => void;
}

/**
 * Rival controlado por una máquina de estados.
 *
 * Ciclo:
 *   IDLE ──► WINDUP ──► ATTACK_ACTIVE ──► HIT ──► COOLDOWN ──► IDLE
 *                │            │
 *                └── parry ───┴──► HIT (stagger) ──► COOLDOWN ──► IDLE
 *
 * La ventana de parry se abre `parryWindowMs` antes del impacto y sigue
 * abierta durante `PARRY_GRACE_AFTER` (indulgencia para los "late parry").
 */
export class Enemy extends Fighter {
  readonly profile: EnemyProfile;
  readonly fsm: CombatStateMachine<CombatState>;

  /** Duración del telegrafiado (ms). */
  readonly windupMs: number;
  /** Longitud de la ventana de parry (ms), antes del impacto. */
  readonly parryWindowMs: number;
  /** Daño que hace al jugador si conecta. */
  readonly damage: number;
  /** Pausa entre ataques (ms). */
  readonly cooldownMs: number;
  /** Espera antes de iniciar el siguiente telegrafiado. */
  readonly idleMs: number;

  private readonly callbacks: EnemyCallbacks;
  private windowOpen = false;
  private parried = false;
  private defeated = false;
  private frozen = true;

  /**
   * @param round Número de rivales ya derrotados: se usa como multiplicador
   *              de dificultad (telegrafiado más corto, ventana más estrecha).
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    profile: EnemyProfile,
    round: number,
    callbacks: EnemyCallbacks,
  ) {
    const maxHp = Math.min(BALANCE.ENEMY_HP_CAP, BALANCE.ENEMY_MAX_HP + BALANCE.ENEMY_HP_STEP * round);

    super(scene, {
      x,
      y,
      facing: -1,
      bodyTexture: bodyTextureKey(profile.key),
      weaponTexture: weaponTextureKey(profile.weapon),
      accent: profile.palette.accent,
      maxHp,
      idleWeaponAngle: 12,
    });

    this.profile = profile;
    this.callbacks = callbacks;

    this.windupMs = Math.max(BALANCE.MIN_WINDUP, BALANCE.BASE_WINDUP - BALANCE.WINDUP_DECREMENT_PER_ROUND * round);
    this.parryWindowMs = Phaser.Math.Clamp(
      BALANCE.BASE_PARRY_WINDOW - BALANCE.WINDOW_DECREMENT_PER_ROUND * round,
      BALANCE.MIN_PARRY_WINDOW,
      this.windupMs * 0.82,
    );
    this.damage = BALANCE.ENEMY_ATTACK_DAMAGE + BALANCE.ENEMY_DAMAGE_STEP * round;
    this.cooldownMs = Math.max(
      BALANCE.MIN_ENEMY_COOLDOWN,
      BALANCE.ENEMY_COOLDOWN - BALANCE.ENEMY_COOLDOWN_DECREMENT * round,
    );
    this.idleMs = Math.max(BALANCE.MIN_ENEMY_IDLE, BALANCE.ENEMY_IDLE_TIME - BALANCE.ENEMY_IDLE_DECREMENT * round);

    this.fsm = new CombatStateMachine<CombatState>(CombatState.IDLE, this.buildStates());
  }

  /* ------------------------------------------------------------------ */
  /*  Máquina de estados                                                 */
  /* ------------------------------------------------------------------ */

  private buildStates(): StateMap<CombatState> {
    return {
      [CombatState.IDLE]: {
        onEnter: () => {
          this.idlePose(200);
          this.setGlow(0, 2, 200);
          this.resetPosition(220);
        },
        onUpdate: (_delta, elapsed) => {
          if (elapsed >= this.idleMs) this.fsm.transition(CombatState.WINDUP);
        },
      },

      [CombatState.WINDUP]: {
        onEnter: () => this.beginWindup(),
        onUpdate: (_delta, elapsed) => this.updateWindup(elapsed),
      },

      [CombatState.ATTACK_ACTIVE]: {
        onEnter: () => this.beginSlash(),
        onUpdate: (_delta, elapsed) => this.updateActive(elapsed),
        onExit: () => {
          this.windowOpen = false;
        },
      },

      [CombatState.HIT]: {
        onEnter: () => this.playStagger(),
        onUpdate: (_delta, elapsed) => {
          if (elapsed >= BALANCE.HIT_STAGGER) this.fsm.transition(CombatState.COOLDOWN);
        },
      },

      [CombatState.COOLDOWN]: {
        onEnter: () => {
          this.windowOpen = false;
          this.idlePose(340);
          this.setGlow(0, 2, 260);
          this.resetPosition(300);
        },
        onUpdate: (_delta, elapsed) => {
          if (elapsed >= this.cooldownMs) this.fsm.transition(CombatState.IDLE);
        },
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Fases del ataque                                                   */
  /* ------------------------------------------------------------------ */

  private beginWindup(): void {
    this.windowOpen = false;
    this.parried = false;

    // El aura crece durante toda la carga: es el "telegraph" a distancia.
    this.setGlow(0.55, 2.5, Math.min(520, this.windupMs * 0.7));

    // Arma hacia atrás, lenta: se lee como "va a golpear".
    this.tweenWeapon(-56, this.windupMs * 0.8, 'Back.easeOut');
    this.bump(16, this.windupMs * 0.7, 0, 'Sine.out');
  }

  private updateWindup(elapsed: number): void {
    if (!this.windowOpen && elapsed >= this.windupMs - this.parryWindowMs) {
      this.windowOpen = true;
      this.callbacks.onWindowOpen?.(this);
    }

    if (elapsed >= this.windupMs) {
      this.fsm.transition(CombatState.ATTACK_ACTIVE);
    }
  }

  private beginSlash(): void {
    // Golpe rápido hacia delante.
    this.tweenWeapon(92, 120, 'Cubic.in', () => this.idlePose(220));
    this.bump(-78, 130, 60, 'Cubic.in');
    this.setGlow(0.95, 2.8, 70);
    this.scene.time.delayedCall(320, () => this.setGlow(0, 2, 320));
    this.callbacks.onSlash?.(this);
  }

  private updateActive(elapsed: number): void {
    if (elapsed < BALANCE.PARRY_GRACE_AFTER) return;
    if (this.parried) return;

    // El golpe conecta: daño al jugador y recuperación del rival.
    this.callbacks.onLand?.(this.damage, this);
    this.fsm.transition(CombatState.HIT);
  }

  private playStagger(): void {
    this.windowOpen = false;
    this.flashBody(0xffffff, 140);
    this.tweenWeapon(64, 200, 'Back.easeOut');
    this.bump(44, 120, 80, 'Quad.out');
    this.setGlow(0.75, 2.4, 90);
    this.scene.time.delayedCall(280, () => this.setGlow(0, 2, 320));
  }

  /* ------------------------------------------------------------------ */
  /*  Interacción con el jugador                                         */
  /* ------------------------------------------------------------------ */

  /** `true` si el jugador puede desviar AHORA MISMO. */
  get isParryWindowOpen(): boolean {
    return this.windowOpen && !this.defeated && !this.frozen;
  }

  /** Duración total de la ventana (incluye la indulgencia posterior). */
  get windowTotalMs(): number {
    return this.parryWindowMs + BALANCE.PARRY_GRACE_AFTER;
  }

  /** Tiempo transcurrido dentro de la ventana (o -1 si está cerrada). */
  get windowElapsedMs(): number {
    if (!this.windowOpen) return -1;
    if (this.fsm.is(CombatState.WINDUP)) {
      return this.fsm.elapsed - (this.windupMs - this.parryWindowMs);
    }
    if (this.fsm.is(CombatState.ATTACK_ACTIVE)) {
      return this.parryWindowMs + this.fsm.elapsed;
    }
    return -1;
  }

  /**
   * Zona "perfecta": el tercio central de la ventana.
   * Acertar ahí da daño extra y un feedback distinto.
   */
  get isPerfectMoment(): boolean {
    const elapsed = this.windowElapsedMs;
    if (elapsed < 0) return false;
    const ratio = elapsed / this.windowTotalMs;
    return ratio >= 0.34 && ratio <= 0.72;
  }

  /** Progreso 0..1 del telegrafiado, para el indicador de impacto. */
  get windupProgress(): number {
    if (!this.fsm.is(CombatState.WINDUP)) return 0;
    return Phaser.Math.Clamp(this.fsm.elapsed / this.windupMs, 0, 1);
  }

  get isDefeated(): boolean {
    return this.defeated;
  }

  get isFrozen(): boolean {
    return this.frozen;
  }

  /**
   * Aplica el parry: cancela el ataque, daña al rival y lo aturde.
   * @returns daño efectivamente aplicado.
   */
  beParried(perfect: boolean): number {
    if (this.defeated) return 0;

    this.parried = true;
    this.windowOpen = false;

    const amount = BALANCE.PARRY_DAMAGE + (perfect ? BALANCE.PERFECT_PARRY_BONUS : 0);
    this.applyDamage(amount);
    this.callbacks.onParried?.(amount, perfect, this);

    if (!this.defeated) {
      this.fsm.transition(CombatState.HIT);
    }
    return amount;
  }

  private applyDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.flashBody(0xffffff, 110);

    if (this.hp <= 0) {
      this.defeated = true;
      this.windowOpen = false;
      this.callbacks.onDefeated?.(this);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Control externo                                                    */
  /* ------------------------------------------------------------------ */

  /** Arranca el combate (se llama al terminar la entrada en escena). */
  beginCombat(): void {
    this.frozen = false;
    this.fsm.reset();
  }

  /** Congela el ciclo (p. ej. en Game Over). */
  setFrozen(value: boolean): void {
    this.frozen = value;
    if (value) {
      this.windowOpen = false;
      this.setGlow(0, 2, 200);
    }
  }

  update(delta: number): void {
    if (this.frozen || this.defeated) return;
    this.fsm.update(delta);
  }

  override playDeath(onComplete?: () => void): void {
    this.defeated = true;
    this.windowOpen = false;
    super.playDeath(onComplete);
  }
}
