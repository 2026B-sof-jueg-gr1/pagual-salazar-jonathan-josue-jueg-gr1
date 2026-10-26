import Phaser from 'phaser';
import { BALANCE, ENEMY_ROSTER, VIEW } from '../config/GameConfig';
import { CombatState } from '../types';
import { buildBackdrop } from '../gfx/Backdrop';
import { buildTextures, TEX } from '../gfx/TextureFactory';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { HealthBar } from '../ui/HealthBar';
import { Hud } from '../ui/Hud';
import { Sfx } from '../audio/Sfx';
import { COLORS } from '../ui/theme';

/* Posiciones fijas del "escenario de duelo". */
const PLAYER_X = 300;
const ENEMY_X = 992;
/** Punto de guardia del jugador: donde se cruzan los filos. */
const GUARD_X = 420;
const GUARD_Y = VIEW.GROUND_Y - 132;

type ScenePhase = 'title' | 'playing' | 'transition' | 'gameover';

/**
 * Escena única del prototipo.
 *
 * Responsabilidades:
 *  - montar escenario, combatientes y HUD;
 *  - traducir la entrada del jugador (E / clic) en intentos de parry;
 *  - arbitrar el ciclo de oleadas y el Game Over;
 *  - presentar el telegrafiado (anillo, línea de amenaza, partícula).
 *
 * La lógica de ataque vive en `Enemy` (máquina de estados) y el daño del
 * jugador en `Player`. Aquí solo se orquesta.
 */
export class MainScene extends Phaser.Scene {
  private player!: Player;
  private enemy: Enemy | null = null;

  private hud!: Hud;
  private playerBar!: HealthBar;
  private enemyBar!: HealthBar;

  private ring!: Phaser.GameObjects.Image;
  private ringGlow!: Phaser.GameObjects.Image;
  private traveler!: Phaser.GameObjects.Image;
  private threatLine!: Phaser.GameObjects.Graphics;

  private parryKey?: Phaser.Input.Keyboard.Key;
  private restartKey?: Phaser.Input.Keyboard.Key;

  private phase: ScenePhase = 'title';

  private round = 0;
  private combo = 0;
  private bestCombo = 0;
  private perfects = 0;
  private totalParries = 0;

  private hitStop = 0;
  private gameOverAt = 0;

  private readonly sfx = new Sfx();

  constructor() {
    super('MainScene');
  }

  /* ================================================================== */
  /*  Ciclo de vida                                                      */
  /* ================================================================== */

  create(): void {
    this.phase = 'title';
    this.round = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.perfects = 0;
    this.totalParries = 0;
    this.hitStop = 0;
    this.gameOverAt = 0;
    this.tweens.timeScale = 1;

    // Las texturas primero: el fondo usa `TEX.dust` y `TEX.glow` (brasas y
    // charcos de luz). Si se invierte el orden, Phaser dibuja su textura
    // __MISSING (los cuadros verdes).
    buildTextures(this);
    buildBackdrop(this);

    // Capa de efectos del telegrafiado
    this.threatLine = this.add.graphics().setDepth(14);
    this.ringGlow = this.add
      .image(GUARD_X, GUARD_Y, TEX.glow)
      .setDepth(19)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.ring = this.add
      .image(GUARD_X, GUARD_Y, TEX.reticle)
      .setDepth(20)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.traveler = this.add
      .image(GUARD_X, GUARD_Y, TEX.spark)
      .setDepth(21)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Combatientes
    this.player = new Player(this, PLAYER_X, VIEW.GROUND_Y);

    // HUD
    this.playerBar = new HealthBar(this, {
      x: 56,
      y: 56,
      width: 368,
      height: 18,
      align: 'left',
      color: COLORS.player,
      label: 'TÚ · RONIN',
    });
    this.playerBar.setMax(BALANCE.PLAYER_MAX_HP);
    this.playerBar.setVisible(false);

    this.enemyBar = new HealthBar(this, {
      x: VIEW.WIDTH - 56 - 368,
      y: 56,
      width: 368,
      height: 18,
      align: 'right',
      color: COLORS.enemy,
      label: 'RIVAL',
    });
    this.enemyBar.setMax(100);
    this.enemyBar.setVisible(false);

    this.hud = new Hud(this);
    this.hud.setWave(1);
    this.hud.setHudVisible(false);

    const data = this.scene.settings.data as { autoStart?: boolean } | undefined;
    if (data?.autoStart) {
      this.time.delayedCall(120, () => this.startRun());
    } else {
      this.hud.showTitle();
    }

    // Entrada
    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.addCapture([Phaser.Input.Keyboard.KeyCodes.E, Phaser.Input.Keyboard.KeyCodes.R]);
      this.parryKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.restartKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    }
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.mouse?.disableContextMenu();

    this.hideLoader();
    this.cameras.main.fadeIn(420, 0, 0, 0);
  }

  override update(_time: number, delta: number): void {
    // Hitstop: congela la lógica y ralentiza las animaciones un instante.
    let dt = delta;
    if (this.hitStop > 0) {
      this.hitStop -= delta;
      dt = delta * 0.12;
      if (this.hitStop <= 0) {
        this.hitStop = 0;
        this.tweens.timeScale = 1;
      }
    }

    if (this.parryKey && Phaser.Input.Keyboard.JustDown(this.parryKey)) {
      this.handleAction();
    }
    if (this.restartKey && Phaser.Input.Keyboard.JustDown(this.restartKey) && this.phase !== 'title') {
      this.restartRun();
    }

    this.enemy?.update(dt);
    this.updateTelegraph();
  }

  /* ================================================================== */
  /*  Entrada                                                            */
  /* ================================================================== */

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (pointer.button !== 0) return; // solo clic izquierdo
    this.handleAction();
  }

  /** Une teclado y ratón en una sola acción. */
  private handleAction(): void {
    if (this.phase === 'title') {
      this.startRun();
      return;
    }
    if (this.phase === 'gameover') {
      if (this.time.now - this.gameOverAt > 800) this.restartRun();
      return;
    }
    if (this.phase !== 'playing') return;
    this.attemptParry();
  }

  /* ================================================================== */
  /*  Flujo de partida                                                   */
  /* ================================================================== */

  private startRun(): void {
    this.sfx.init();
    this.sfx.ui();
    this.phase = 'playing';
    this.hud.hideTitle();
    this.hud.setHudVisible(true);
    this.playerBar.setVisible(true);
    this.hud.setHint('[ E ]  ·  CLIC IZQUIERDO   →   PARRY');
    this.spawnEnemy();
  }

  private restartRun(): void {
    this.sfx.ui();
    // `autoStart` evita volver a la pantalla de título al reiniciar.
    this.scene.restart({ autoStart: true });
  }

  private spawnEnemy(): void {
    const profile = ENEMY_ROSTER[this.round % ENEMY_ROSTER.length];

    // Se crea YA en su posición final: así `homeX` es correcto y las
    // embestidas/knockbacks no lo devuelven fuera de pantalla. La entrada se
    // anima desplazando el contenedor desde la derecha.
    const enemy = new Enemy(this, ENEMY_X, VIEW.GROUND_Y, profile, this.round, {
      onWindowOpen: () => this.onWindowOpen(),
      onSlash: () => this.onEnemySlash(),
      onLand: (damage) => this.onPlayerHit(damage),
      onDefeated: () => this.onEnemyDefeated(),
    });

    this.enemy = enemy;
    this.tweens.killTweensOf(enemy.container);
    enemy.container.x = ENEMY_X + 300;
    enemy.container.setAlpha(0);

    this.enemyBar.setVisible(true);
    this.enemyBar.setLabel(profile.name);
    this.enemyBar.setMax(enemy.maxHp);
    this.enemyBar.setValue(enemy.maxHp);
    this.hud.setWave(this.round + 1);

    this.hud.announce(
      profile.name,
      `${profile.title}  ·  ventana de parry ${Math.round(enemy.parryWindowMs)} ms`,
      COLORS.text,
    );

    this.tweens.add({
      targets: enemy.container,
      x: ENEMY_X,
      alpha: 1,
      duration: 640,
      ease: 'Cubic.out',
      onComplete: () => {
        if (this.enemy === enemy) enemy.beginCombat();
      },
    });

    this.dustBurst(ENEMY_X, VIEW.GROUND_Y, profile.palette.accent);
  }

  /* ================================================================== */
  /*  Parry                                                              */
  /* ================================================================== */

  private attemptParry(): void {
    const now = this.time.now;

    // Castigo por spam: si está bloqueado, la pulsación no hace nada.
    if (this.player.isLockedOut(now)) {
      this.hud.pulseLockout();
      return;
    }

    const enemy = this.enemy;

    if (enemy && enemy.isParryWindowOpen) {
      this.resolveParry(enemy);
      return;
    }

    // Fallo: pulsó fuera de la ventana (antes o cuando no había ataque).
    this.player.lockFor(BALANCE.FAILED_PARRY_LOCKOUT);
    this.player.playWhiff();
    this.sfx.whiff();
    this.hud.pulseLockout();

    const incoming = enemy && enemy.fsm.is(CombatState.WINDUP, CombatState.ATTACK_ACTIVE);
    this.hud.popText(
      GUARD_X,
      GUARD_Y - 112,
      incoming ? '¡DEMASIADO PRONTO!' : 'AL AIRE',
      COLORS.dangerText,
      20,
    );
  }

  private resolveParry(enemy: Enemy): void {
    const perfect = enemy.isPerfectMoment;

    this.player.playParry();
    enemy.beParried(perfect); // aplica daño y aturde (puede desencadenar onDefeated)

    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.totalParries += 1;
    if (perfect) this.perfects += 1;

    this.enemyBar.setValue(enemy.hp);
    this.hud.setCombo(this.combo);

    // Feedback: flash + sacudida + hitstop + chispas
    this.cameras.main.flash(perfect ? 150 : 105, 255, 255, 255);
    this.cameras.main.shake(perfect ? 200 : 140, perfect ? 0.011 : 0.007);
    this.startHitStop(perfect ? BALANCE.PERFECT_HITSTOP_MS : BALANCE.HITSTOP_MS);
    this.sparkBurst(GUARD_X, GUARD_Y, perfect ? COLORS.gold : 0xffffff, perfect ? 24 : 15);

    this.hud.popText(
      GUARD_X,
      GUARD_Y - 92,
      perfect ? '¡PERFECTO!' : 'PARRY',
      perfect ? COLORS.goldText : COLORS.playerText,
      perfect ? 30 : 26,
    );

    this.sfx.clang(perfect);
  }

  private onWindowOpen(): void {
    this.sfx.tick();

    // Anillo que estalla hacia fuera: "AHORA".
    const cue = this.add
      .image(GUARD_X, GUARD_Y, TEX.ring)
      .setDepth(22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.5)
      .setAlpha(0.95);

    this.tweens.add({
      targets: cue,
      scale: 2,
      alpha: 0,
      duration: 300,
      ease: 'Quad.out',
      onComplete: () => cue.destroy(),
    });
  }

  /* ================================================================== */
  /*  Daño y oleadas                                                     */
  /* ================================================================== */

  private onPlayerHit(damage: number): void {
    const dead = this.player.takeDamage(damage);

    this.playerBar.setValue(this.player.hp);
    this.combo = 0;
    this.hud.setCombo(0);

    this.cameras.main.shake(280, 0.013);
    this.cameras.main.flash(150, 88, 0, 14);
    this.sparkBurst(GUARD_X - 34, GUARD_Y, COLORS.danger, 14);
    this.hud.popText(GUARD_X - 24, GUARD_Y - 64, `-${damage}`, COLORS.dangerText, 28);
    this.sfx.hit();

    if (dead) this.gameOver();
  }

  private onEnemySlash(): void {
    this.sfx.whoosh();

    const slash = this.add
      .image(GUARD_X + 30, GUARD_Y, TEX.slash)
      .setDepth(21)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffb9a4)
      .setScale(0.72)
      .setAngle(22)
      .setAlpha(0.85);

    this.tweens.add({
      targets: slash,
      alpha: 0,
      scale: 1.15,
      angle: 46,
      duration: 250,
      ease: 'Cubic.out',
      onComplete: () => slash.destroy(),
    });

    this.cameras.main.shake(90, 0.0022);
  }

  private onEnemyDefeated(): void {
    if (this.phase === 'gameover') return;

    this.phase = 'transition';
    this.round += 1;

    const defeated = this.enemy;
    this.enemyBar.setValue(0);

    if (defeated) {
      defeated.setFrozen(true);
      defeated.playDeath();
      this.sparkBurst(defeated.container.x, defeated.container.y - 110, defeated.accent, 26);
    }

    this.cameras.main.shake(340, 0.009);
    this.cameras.main.flash(170, 255, 240, 215);
    this.sfx.defeat();

    this.hud.announce(
      `OLEADA ${this.round.toString().padStart(2, '0')} SUPERADA`,
      `+${BALANCE.PLAYER_HEAL_PER_WAVE} HP`,
      COLORS.goldText,
    );

    this.player.heal(BALANCE.PLAYER_HEAL_PER_WAVE);
    this.playerBar.setValue(this.player.hp);

    this.time.delayedCall(1500, () => {
      if (this.phase !== 'transition') return;
      defeated?.destroy();
      this.enemy = null;
      this.spawnEnemy();
      this.phase = 'playing';
    });
  }

  private gameOver(): void {
    this.phase = 'gameover';
    this.gameOverAt = this.time.now;

    this.enemy?.setFrozen(true);
    this.player.playDeath();

    this.cameras.main.shake(520, 0.018);
    this.cameras.main.flash(260, 160, 24, 32);
    this.ring.setAlpha(0);
    this.ringGlow.setAlpha(0);
    this.traveler.setAlpha(0);
    this.sfx.defeat();

    this.time.delayedCall(640, () => {
      if (this.phase !== 'gameover') return;
      this.hud.showGameOver({
        enemiesDefeated: this.round,
        bestCombo: this.bestCombo,
        perfects: this.perfects,
        totalParries: this.totalParries,
      });
    });
  }

  /* ================================================================== */
  /*  Telegrafiado                                                       */
  /* ================================================================== */

  private updateTelegraph(): void {
    const enemy = this.enemy;
    this.threatLine.clear();

    const visible =
      enemy !== null &&
      !enemy.isDefeated &&
      this.phase === 'playing' &&
      enemy.fsm.is(CombatState.WINDUP, CombatState.ATTACK_ACTIVE);

    if (!enemy || !visible) {
      this.fadeTelegraph();
      return;
    }

    const windup = enemy.fsm.is(CombatState.WINDUP);
    const t = windup ? enemy.windupProgress : 1;
    const open = enemy.isParryWindowOpen;
    const pulse = open ? 1 + Math.sin(this.time.now * 0.05) * 0.055 : 1;
    const tint = open ? 0xffffff : 0xff7a8a;

    // El anillo se cierra sobre el punto de guardia: "llega el golpe".
    this.ring.setAlpha(open ? 0.95 : 0.16 + t * 0.5);
    this.ring.setScale((2.2 - 1.2 * t) * pulse);
    this.ring.setTint(tint);

    this.ringGlow.setAlpha(open ? 0.55 : 0.1 + t * 0.2);
    this.ringGlow.setScale(0.9 + t * 1.05);
    this.ringGlow.setTint(tint);

    // Línea de amenaza desde el rival hasta el punto de impacto.
    this.threatLine.lineStyle(2, tint, open ? 0.5 : 0.1 + t * 0.3);
    this.threatLine.beginPath();
    this.threatLine.moveTo(enemy.chestX, enemy.chestY);
    this.threatLine.lineTo(GUARD_X, GUARD_Y);
    this.threatLine.strokePath();

    // Partícula que viaja por la línea y llega al punto de guardia al impactar.
    this.traveler.setPosition(
      Phaser.Math.Linear(enemy.chestX, GUARD_X, t),
      Phaser.Math.Linear(enemy.chestY, GUARD_Y, t),
    );
    this.traveler.setAlpha(0.2 + t * 0.75);
    this.traveler.setScale(0.16 + t * 0.34);
    this.traveler.setTint(tint);
  }

  private fadeTelegraph(): void {
    this.ring.setAlpha(Math.max(0, this.ring.alpha - 0.08));
    this.ringGlow.setAlpha(Math.max(0, this.ringGlow.alpha - 0.08));
    this.traveler.setAlpha(Math.max(0, this.traveler.alpha - 0.1));
  }

  /* ================================================================== */
  /*  Utilidades visuales                                                */
  /* ================================================================== */

  private startHitStop(ms: number): void {
    this.hitStop = Math.max(this.hitStop, ms);
    this.tweens.timeScale = 0.12;
  }

  private sparkBurst(x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 40 + Math.random() * 165;
      const spark = this.add
        .image(x, y, TEX.spark)
        .setDepth(23)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(color)
        .setScale(0.12 + Math.random() * 0.36)
        .setAngle(Math.random() * 360);

      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + 34,
        alpha: 0,
        scale: 0.02,
        angle: spark.angle + 200,
        duration: 360 + Math.random() * 340,
        ease: 'Cubic.out',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private dustBurst(x: number, y: number, color: number): void {
    for (let i = 0; i < 14; i++) {
      const dust = this.add
        .image(x + (Math.random() * 90 - 45), y, TEX.dust)
        .setDepth(12)
        .setTint(color)
        .setAlpha(0.5)
        .setScale(0.4 + Math.random() * 0.9)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: dust,
        y: y - 40 - Math.random() * 90,
        x: dust.x + (Math.random() * 60 - 30),
        alpha: 0,
        scale: 0.1,
        duration: 520 + Math.random() * 420,
        ease: 'Quad.out',
        onComplete: () => dust.destroy(),
      });
    }
  }

  private hideLoader(): void {
    const loader = document.getElementById('loader');
    if (!loader) return;
    loader.classList.add('hidden');
    window.setTimeout(() => loader.remove(), 600);
  }
}
