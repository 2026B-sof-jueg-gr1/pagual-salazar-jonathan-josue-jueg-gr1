import Phaser from 'phaser';
import { Sfx } from '../audio/Sfx';
import { drawEnemy, drawWorld, loadArt, type EnemyKind } from './TwinUsArt';
import { TwinUsHud } from './TwinUsHud';
import {
  ARENA, ARMOR, BALANCE, CHECKPOINTS, newRun, PLATFORMS, SIDE_WEAPON,
  WEAPONS, WORLD, ZONES, type Run, type Weapon,
} from './level';

type Mode = 'title' | 'playing' | 'pause' | 'map' | 'victory';
type Phase = 'idle' | 'windup' | 'recover' | 'shield';
type Key = Phaser.Input.Keyboard.Key;
type Target = { x: number; y: number };

interface Enemy {
  kind: EnemyKind;
  body: Phaser.Physics.Arcade.Body;
  anchor: Phaser.GameObjects.Rectangle;
  art: Phaser.GameObjects.Graphics;
  home: number;
  hp: number;
  maxHp: number;
  next: number;
  phase: Phase;
  facing: number;
  recoil: number;
}
interface Shot {
  art: Phaser.GameObjects.Ellipse;
  friendly: boolean;
  dx: number;
  dy: number;
  damage: number;
  end: number;
}
interface Marker {
  art: Phaser.GameObjects.Container;
  x: number;
  y: number;
  label: string;
  action: () => void;
}

const BOSS_HP = 120;
const SHIELD_THRESHOLD = 62;
const KEEP_ZONE = 5;
const BOSS_GATE = ARENA.entrance - 49;
const CONTROLS = {
  left: 'A', right: 'D', jump: 'SPACE', dash: 'SHIFT', parry: 'R', frenzy: 'C', heal: 'Q',
  interact: 'E', menu: 'ESC', map: 'TAB',
} as const;

export class TwinUsScene extends Phaser.Scene {
  private run = newRun();
  private mode: Mode = 'title';
  private now = 0;
  private hp = BALANCE.life as number;
  private energy = BALANCE.energy as number;
  private injectors = BALANCE.injectors as number;
  private parries = BALANCE.parries as number;
  private nextCharge = 0;
  private parryEnd = 0;
  private parryReady = 0;
  private dashEnd = 0;
  private dashReady = 0;
  private frenzy = 0;
  private frenzyEnd = 0;
  private invulnerable = 0;
  private meleeEnd = 0;
  private meleeReady = 0;
  private shotReady = 0;
  private facing = 1;
  private shield = 0;
  private shieldCleared = false;
  private zone = 0;
  private message = '';
  private messageEnd = 0;
  private enemies: Enemy[] = [];
  private shots: Shot[] = [];
  private markers: Marker[] = [];
  private boss?: Enemy;
  private hero!: Phaser.GameObjects.Image;
  private anchor!: Phaser.GameObjects.Rectangle;
  private body!: Phaser.Physics.Arcade.Body;
  private terrain!: Phaser.Physics.Arcade.StaticGroup;
  private armorGate!: Phaser.GameObjects.Rectangle;
  private bossGate!: Phaser.GameObjects.Rectangle;
  private exitGate!: Phaser.GameObjects.Rectangle;
  private core!: Phaser.GameObjects.Graphics;
  private effects!: Phaser.GameObjects.Graphics;
  private aimArt!: Phaser.GameObjects.Graphics;
  private hud!: TwinUsHud;
  private keys!: Record<keyof typeof CONTROLS, Key>;
  private readonly sfx = new Sfx();
  private readonly aim = new Phaser.Math.Vector2();
  private nextGhost = 0;
  private parryFlash = 0;

  constructor(private readonly showMenu: (mode: Mode, visited: number) => void) {
    super('TwinUs');
  }

  preload(): void {
    loadArt(this);
  }

  create(data: { run?: Run; reason?: 'death' | 'restart' } = {}): void {
    this.run = data.run ?? newRun();
    this.mode = data.reason ? 'playing' : 'title';
    this.now = 0;
    this.hp = BALANCE.life;
    this.energy = BALANCE.energy;
    this.injectors = BALANCE.injectors;
    this.parries = BALANCE.parries;
    this.nextCharge = this.parryEnd = this.parryReady = 0;
    this.dashEnd = this.dashReady = this.frenzyEnd = this.frenzy = 0;
    this.meleeEnd = this.meleeReady = this.shotReady = 0;
    this.invulnerable = 0;
    this.facing = 1;
    this.zone = 0;
    this.message = '';
    this.messageEnd = 0;
    this.nextGhost = 0;
    this.parryFlash = 0;
    this.shots = [];
    this.markers = [];

    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height, true, true, true, false);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    drawWorld(this);
    this.terrain = this.physics.add.staticGroup();
    for (const { x, y, w, h } of PLATFORMS) this.terrain.add(this.add.rectangle(x + w / 2, y + h / 2, w, h).setVisible(false));

    this.armorGate = this.makeGate(1253, 0x55d8e2);
    this.bossGate = this.makeGate(BOSS_GATE, 0xe482a4);
    this.exitGate = this.makeGate(ARENA.exit, 0xe482a4);
    this.gate(this.armorGate, !this.run.weapons.includes('pulse'));
    this.gate(this.exitGate, !this.run.bossDefeated);

    const stop = CHECKPOINTS[this.run.checkpoint];
    const spawn = data.reason ? stop.x : 96;
    this.anchor = this.add.rectangle(spawn, WORLD.floor - 35, 34, 69).setVisible(false);
    this.physics.add.existing(this.anchor);
    this.body = this.anchor.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.physics.add.collider(this.anchor, this.terrain);
    this.hero = this.add.image(spawn, WORLD.floor, 'human').setOrigin(.5, 1).setDepth(8);
    this.cameras.main.startFollow(this.anchor, true, .11, .14, -95, 49);
    this.cameras.main.centerOn(spawn + 95, WORLD.floor - 80);
    this.effects = this.add.graphics().setDepth(7);
    this.aimArt = this.add.graphics().setDepth(9);
    this.core = this.add.graphics().setDepth(10);
    this.hud = new TwinUsHud(this);
    this.enemies = [];
    this.resetEncounter();
    this.createMarkers();
    this.createAmbience();

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('TwinUs requiere teclado.');
    this.keys = keyboard.addKeys(CONTROLS) as typeof this.keys;
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('wheel', this.onWheel, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.onPointerDown, this);
      this.input.off('wheel', this.onWheel, this);
    });
    this.setMode(this.mode);
    this.renderHero();
    this.renderHud();
    if (data.reason === 'death') this.notice('Has vuelto al último descanso.', 2200);
  }

  start(): void {
    this.sfx.init();
    this.sfx.ui();
    this.setMode('playing');
  }

  openMap(): void {
    if (this.mode === 'pause') this.setMode('map');
  }

  restart(): void {
    this.scene.restart({ reason: 'restart' });
  }

  private setMode(mode: Mode): void {
    this.mode = mode;
    if (mode === 'playing') this.physics.resume();
    else this.physics.pause();
    this.showMenu(mode, this.run.visited);
  }

  override update(_time: number, delta: number): void {
    const pressed = Phaser.Input.Keyboard.JustDown;
    const menu = pressed(this.keys.menu);
    const map = pressed(this.keys.map);
    if (this.mode === 'pause' || this.mode === 'map') {
      if (menu || (map && this.mode === 'map')) this.start();
      else if (map) this.setMode('map');
      return;
    }
    if (this.mode !== 'playing') return;
    if (menu || map) { this.setMode(menu ? 'pause' : 'map'); return; }

    const dt = Math.min(delta, 36);
    this.now += dt;
    for (let i = ZONES.length - 1; i >= 0; i--) {
      if (this.anchor.x >= ZONES[i].x) { this.zone = i; break; }
    }
    this.run.visited = Math.max(this.run.visited, this.zone);
    this.refreshResources(dt);
    this.keysFrame(pressed);
    if (this.anchor.y > WORLD.height + 62) { this.die(); return; }

    for (const enemy of this.enemies) this.updateEnemy(enemy);
    this.updateShots(dt / 1000);
    if (this.hp <= 0) { this.die(); return; }
    this.renderHero();
    this.renderCore();
    this.renderHud();

    if (this.run.bossDefeated && this.anchor.x > ARENA.exit + 95) {
      this.sfx.defeat();
      this.setMode('victory');
    }
  }

  private keysFrame(pressed: (key: Key) => boolean): void {
    if (pressed(this.keys.interact)) this.nearbyMarker()?.action();
    if (pressed(this.keys.heal) && this.injectors > 0 && this.hp < BALANCE.life) {
      this.hp = Math.min(BALANCE.life, this.hp + BALANCE.heal);
      this.injectors--;
      this.sfx.ui();
      this.notice('Inyector utilizado');
    }
    if (pressed(this.keys.frenzy) && this.frenzy === 1 && !this.frenzied) {
      this.frenzy = 0;
      this.frenzyEnd = this.now + BALANCE.frenzyDuration;
      this.sfx.clang(true);
      this.notice('Melee potenciado · armazón desactivado');
    }
    if (pressed(this.keys.parry)) {
      if (this.parries > 0 && this.now >= this.parryReady) {
        this.parryEnd = this.now + BALANCE.parryWindow;
        this.parryReady = this.now + BALANCE.parryCooldown;
        this.parryFlash = this.now + BALANCE.parryWindow;
        this.sfx.whiff();
        this.shieldSpark(this.anchor.x, this.anchor.y - 24);
      } else {
        // Sin cargas o en recarga: aviso seco, sin coste adicional.
        this.sfx.tick();
        this.notice(this.parries > 0 ? 'Parry en recarga' : 'Sin cargas de parry · usa Shift para esquivar', 900);
      }
    }
    if (this.now < this.dashEnd) return;
    this.body.setAllowGravity(true);
    const move = Number(this.keys.right.isDown) - Number(this.keys.left.isDown);
    if (move !== 0) this.facing = move;
    if (pressed(this.keys.dash) && this.now >= this.dashReady) {
      this.dashEnd = this.now + BALANCE.dashDuration;
      this.dashReady = this.now + BALANCE.dashCooldown;
      this.body.setAllowGravity(false).setVelocity(this.facing * BALANCE.dashSpeed, 0);
      this.sfx.whoosh();
      return;
    }
    this.body.setVelocityX(move * BALANCE.speed * (this.frenzied ? 1.26 : 1));
    if (pressed(this.keys.jump) && this.body.blocked.down) {
      this.body.setVelocityY(-BALANCE.jump * (this.frenzied ? 1.05 : 1));
      this.sfx.whoosh();
    }
  }

  private get frenzied(): boolean {
    return this.now < this.frenzyEnd;
  }

  private get weapon(): Weapon | undefined {
    return this.run.weapons[this.run.weaponIndex];
  }

  private refreshResources(dt: number): void {
    this.energy = Math.min(BALANCE.energy, this.energy + dt * BALANCE.passiveEnergy / 1000);
    if (this.parries < BALANCE.parries && this.now >= this.nextCharge) {
      this.parries++;
      this.nextCharge = this.now + BALANCE.parryRecharge;
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.mode !== 'playing') return;
    if (pointer.button === 2) this.melee();
    if (pointer.button === 0) this.fire(pointer);
  }

  private onWheel(_pointer: Phaser.Input.Pointer, _objects: unknown[], _dx: number, dy: number): void {
    const count = this.run.weapons.length;
    if (this.mode !== 'playing' || count < 2 || dy === 0) return;
    this.run.weaponIndex = (this.run.weaponIndex + Math.sign(dy) + count) % count;
    this.sfx.ui();
    this.notice('Arma seleccionada · ' + WEAPONS[this.weapon!].label);
  }

  private melee(): void {
    if (this.now < this.meleeReady) return;
    this.meleeReady = this.now + (this.frenzied ? 260 : 410);
    this.meleeEnd = this.now + 145;
    this.sfx.whoosh();
    for (const enemy of this.enemies) {
      const dx = (enemy.anchor.x - this.anchor.x) * this.facing;
      const dy = Math.abs(enemy.anchor.y - this.anchor.y);
      if (enemy.hp <= 0 || dx < -14 || dx > (this.frenzied ? 124 : 95) || dy > 72) continue;
      if (enemy.phase === 'shield') { this.notice('Dispara al núcleo con el armazón'); continue; }
      this.hurtEnemy(enemy, this.frenzied ? 28 : 17);
      this.energy = Math.min(BALANCE.energy, this.energy + BALANCE.strikeEnergy);
      if (!this.frenzied) this.frenzy = Math.min(1, this.frenzy + BALANCE.strikeFrenzy / 100);
    }
  }

  private fire(pointer: Phaser.Input.Pointer): void {
    const selected = this.weapon;
    if (!selected || this.frenzied || this.now < this.shotReady) return;
    const weapon = WEAPONS[selected];
    if (this.energy < weapon.cost) { this.notice('Recuperando energía'); return; }
    this.energy -= weapon.cost;
    this.shotReady = this.now + weapon.delay;
    pointer.positionToCamera(this.cameras.main, this.aim);
    this.spawnShot({ x: this.anchor.x, y: this.anchor.y - 10 }, this.aim, weapon.speed, weapon.damage, weapon.color, true);
    this.sfx.shoot();
  }

  private makeGate(x: number, color: number): Phaser.GameObjects.Rectangle {
    const gate = this.add.rectangle(x, WORLD.floor - 170, 17, 340, color, .56).setDepth(2);
    gate.setStrokeStyle(2, color);
    this.terrain.add(gate);
    return gate;
  }

  private gate(gate: Phaser.GameObjects.Rectangle, closed: boolean): void {
    gate.setVisible(closed);
    (gate.body as Phaser.Physics.Arcade.StaticBody).enable = closed;
  }

  private createMarkers(): void {
    CHECKPOINTS.forEach((stop, index) =>
      this.marker(stop, 0x80ffce, 'E  ·  Descansar en ' + stop.name, () => this.rest(index)));
    if (!this.run.weapons.includes('pulse')) {
      this.marker(ARMOR, 0x6ff6ee, 'E  ·  Recuperar el armazón', () => this.unlock('pulse'));
    }
    if (!this.run.weapons.includes('lance')) {
      this.marker(SIDE_WEAPON, 0xffce83, 'E  ·  Recoger Lanza', () => this.unlock('lance'));
    }
  }

  private marker(target: Target, color: number, label: string, action: () => void): void {
    const glow = this.add.circle(0, 0, 20, color, .15);
    const center = this.add.rectangle(0, 0, 14, 14, color, .88).setAngle(45);
    const art = this.add.container(target.x, target.y, [glow, center]).setDepth(3);
    this.tweens.add({ targets: glow, scale: 1.55, alpha: .5, duration: 850, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.markers.push({ ...target, art, label, action });
  }

  private nearbyMarker(): Marker | undefined {
    return this.markers.find((marker) => Math.abs(this.anchor.x - marker.x) < 72 && Math.abs(this.anchor.y - marker.y) < 67);
  }

  private unlock(weapon: Weapon): void {
    if (this.run.weapons.includes(weapon)) return;
    const object = this.nearbyMarker();
    object?.art.destroy();
    this.markers = this.markers.filter((marker) => marker !== object);
    this.run.weapons.push(weapon);
    this.run.weaponIndex = this.run.weapons.length - 1;
    if (weapon === 'pulse') this.gate(this.armorGate, false);
    this.sfx.clang(true);
    this.notice(weapon === 'pulse' ? 'Armazón enlazado · clic izquierdo para disparar' : 'Lanza equipada · rueda para cambiar de arma', 3200);
  }

  private rest(index: number): void {
    this.run.checkpoint = index;
    this.hp = BALANCE.life;
    this.injectors = BALANCE.injectors;
    this.resetEncounter();
    this.sfx.ui();
    this.notice('Descanso registrado · vida e inyectores restaurados', 2600);
  }

  private die(): void {
    this.sfx.defeat();
    this.scene.restart({ run: this.run, reason: 'death' });
  }

  private resetEncounter(): void {
    for (const enemy of this.enemies) this.removeEnemy(enemy);
    for (const shot of this.shots) shot.art.destroy();
    this.enemies = [
      this.makeEnemy('aggressor', 912, 51),
      this.makeEnemy('shooter', 1675, 45),
    ];
    this.shots = [];
    this.boss = undefined;
    this.shield = 0;
    this.shieldCleared = false;
    this.gate(this.bossGate, false);
    this.core.clear();
  }

  private makeEnemy(kind: EnemyKind, x: number, hp: number): Enemy {
    const boss = kind === 'boss';
    const anchor = this.add.rectangle(x, WORLD.floor - (boss ? 52 : 34), boss ? 51 : 34, boss ? 104 : 68).setVisible(false);
    this.physics.add.existing(anchor);
    this.physics.add.collider(anchor, this.terrain);
    const body = anchor.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    return {
      kind, anchor, body, art: this.add.graphics().setDepth(6), home: x, hp, maxHp: hp,
      phase: 'idle', next: this.now + 700, facing: -1, recoil: 0,
    };
  }

  private updateEnemy(enemy: Enemy): void {
    if (enemy.hp <= 0) return;
    const dx = this.anchor.x - enemy.anchor.x;
    const distance = Math.abs(dx);
    const dy = Math.abs(this.anchor.y - enemy.anchor.y);
    const boss = enemy.kind === 'boss';
    const shooter = enemy.kind === 'shooter';
    const reach = boss ? 124 : 79;

    if (enemy.phase === 'idle') {
      const move = boss ? (distance > 91 ? Math.sign(dx) * 133 : 0) : this.enemyMove(enemy, dx);
      if (move || distance < 410) enemy.facing = Math.sign(move || dx) || enemy.facing;
      enemy.body.setVelocityX(move);
      const canAttack = shooter ? distance <= 415 && dy < 235 : distance <= reach && dy < 75;
      if (canAttack && this.now >= enemy.next) {
        enemy.phase = 'windup';
        enemy.next = this.now + (boss && this.shieldCleared ? 510 : 670);
        enemy.body.setVelocityX(0);
        if (distance < 430) this.sfx.tick();
      }
    } else {
      enemy.body.setVelocityX(0);
      if (this.now >= enemy.next) {
        if (enemy.phase === 'windup') {
          if (shooter) this.hostileShot(enemy.anchor.x, enemy.anchor.y - 12, 390, 14);
          else if (dx * enemy.facing >= -20 && distance <= reach && dy < 76) {
            if (this.damagePlayer(boss ? 26 : 19)) this.hurtEnemy(enemy, boss ? 14 : 12);
          }
          if (enemy.hp > 0 && (enemy.phase as Phase) === 'windup') {
            enemy.phase = 'recover';
            enemy.next = this.now + (boss ? 510 : 820);
          }
        } else if (enemy.phase === 'recover') {
          enemy.phase = 'idle';
          enemy.next = this.now + 160;
        } else if (enemy.phase === 'shield') {
          const target = this.shieldCenter();
          this.hostileShot(target.x, target.y, 325, 19);
          enemy.next = this.now + 1750;
        }
      }
    }

    if (enemy.hp <= 0) return;
    const telegraph = enemy.phase === 'windup';
    const windup = telegraph ? Phaser.Math.Clamp(1 - (enemy.next - this.now) / 670, 0, 1) : 0;
    const parryMoment = telegraph && enemy.next - this.now < BALANCE.parryWindow * .78;
    const color = enemy.recoil > this.now ? 0xffffff : parryMoment ? 0xffe1ad : telegraph ? 0xffad6e
      : enemy.phase === 'shield' ? 0x75c5ff : boss ? 0xe375ac : 0xf4a56d;
    const stride = Math.sin(this.now / 65) * (enemy.body.velocity.x === 0 ? 0 : 4);
    enemy.art.setPosition(enemy.anchor.x, enemy.body.bottom);
    drawEnemy(enemy.art, {
      kind: enemy.kind,
      facing: enemy.facing,
      accent: color,
      stride,
      recoil: enemy.recoil > this.now,
      windup,
      shield: enemy.phase === 'shield',
      now: this.now,
    });
    this.drawTelegraph(enemy, windup, parryMoment, color);

    const barY = boss ? -152 : -96;
    enemy.art.fillStyle(0x0a1522, .85).fillRect(-20, barY, 40, 4)
      .fillStyle(color).fillRect(-20, barY, 40 * enemy.hp / enemy.maxHp, 4);
  }

  private enemyMove(enemy: Enemy, dx: number): number {
    const distance = Math.abs(dx);
    const limit = enemy.kind === 'shooter' ? 125 : 150;
    const offset = enemy.anchor.x - enemy.home;
    let speed = 0;
    if (enemy.kind === 'shooter') {
      if (distance < 155) speed = -Math.sign(dx) * 112;
      else if (distance > 310 && distance < 430) speed = Math.sign(dx) * 85;
    } else if (distance > 56 && distance < 245) speed = Math.sign(dx) * 141;
    else if (distance >= 245 && Math.abs(offset) > 8) speed = -Math.sign(offset) * 70;
    return Math.abs(offset) >= limit && Math.sign(speed) === Math.sign(offset) ? 0 : speed;
  }

  private damagePlayer(damage: number): boolean {
    if (this.now < this.dashEnd || this.now < this.invulnerable) return false;
    if (this.now < this.parryEnd && this.parries > 0) {
      if (this.parries === BALANCE.parries) this.nextCharge = this.now + BALANCE.parryRecharge;
      this.parries--;
      this.parryEnd = 0;
      this.parryFlash = this.now + 180;
      this.invulnerable = this.now + 145;
      this.sfx.clang(true);
      this.cameras.main.flash(70, 190, 255, 250);
      this.cameras.main.shake(120, 0.006);
      this.parryBurst(this.anchor.x, this.anchor.y - 24);
      this.floatText(this.anchor.x, this.anchor.y - 96, '¡PARRY!', 0xbafff9, 22);
      this.notice('¡PARRY!', 500);
      return true;
    }
    this.hp = Math.max(0, this.hp - damage);
    this.invulnerable = this.now + 680;
    this.sfx.hit();
    this.cameras.main.shake(150, .006);
    return false;
  }

  private hurtEnemy(enemy: Enemy, damage: number): void {
    if (enemy.hp <= 0 || enemy.phase === 'shield') return;
    enemy.recoil = this.now + 140;
    enemy.hp = Math.max(0, enemy.hp - damage);
    this.sfx.hit();

    if (enemy === this.boss && !this.shieldCleared && enemy.hp <= SHIELD_THRESHOLD) {
      enemy.hp = SHIELD_THRESHOLD;
      enemy.phase = 'shield';
      enemy.next = this.now + 1050;
      this.shield = 3;
      this.notice('Dispara al núcleo · espera si el frenesí sigue activo', 3700);
      this.sfx.clang();
      return;
    }
    if (enemy.hp > 0) return;
    this.removeEnemy(enemy);
    if (enemy === this.boss) {
      this.run.bossDefeated = true;
      this.gate(this.bossGate, false);
      this.gate(this.exitGate, false);
      this.notice('Centinela superado · avanza hacia la salida', 4600);
      this.sfx.defeat();
    }
  }

  private removeEnemy(enemy: Enemy): void {
    if (!enemy.anchor.active) return;
    enemy.anchor.destroy();
    enemy.art.destroy();
  }

  private hostileShot(x: number, y: number, speed: number, damage: number): void {
    this.sfx.shoot();
    this.spawnShot({ x, y }, { x: this.anchor.x, y: this.anchor.y - 7 }, speed, damage, 0xff8aab, false);
  }

  private spawnShot(origin: Target, target: Target, speed: number, damage: number, color: number, friendly: boolean): void {
    const theta = Phaser.Math.Angle.Between(origin.x, origin.y, target.x, target.y);
    const x = Math.cos(theta);
    const y = Math.sin(theta);
    const art = this.add.ellipse(origin.x + x * 28, origin.y + y * 28, friendly ? 21 : 18, 10, color)
      .setRotation(theta).setDepth(10).setStrokeStyle(1, 0xffffff, .76);
    this.shots.push({ art, friendly, dx: x * speed, dy: y * speed, damage, end: this.now + 1900 });
  }

  private updateShots(dt: number): void {
    this.shots = this.shots.filter((shot) => {
      const { art } = shot;
      const oldX = art.x;
      const oldY = art.y;
      art.x += shot.dx * dt;
      art.y += shot.dy * dt;
      const path = new Phaser.Geom.Line(oldX, oldY, art.x, art.y);
      let hit = this.now >= shot.end || PLATFORMS.some(({ x, y, w, h }) =>
        Phaser.Geom.Intersects.LineToRectangle(path, new Phaser.Geom.Rectangle(x, y, w, h)));
      if (!hit) {
        for (const gate of [this.armorGate, this.bossGate, this.exitGate]) {
          if (gate.visible && Phaser.Geom.Intersects.LineToRectangle(path, gate.getBounds())) { hit = true; break; }
        }
      }
      if (!hit) hit = shot.friendly ? this.friendlyImpact(shot, path) : this.hostileImpact(shot, path);
      if (hit) art.destroy();
      return !hit;
    });
  }

  private friendlyImpact(shot: Shot, path: Phaser.Geom.Line): boolean {
    if (this.shield > 0) {
      const center = this.shieldCenter();
      if (Phaser.Geom.Intersects.LineToCircle(path, new Phaser.Geom.Circle(center.x, center.y, 34))) {
        this.shield--;
        this.sfx.clang(true);
        if (this.shield === 0 && this.boss) {
          this.boss.phase = 'recover';
          this.boss.next = this.now + 1050;
          this.shieldCleared = true;
          this.notice('Núcleo destruido · vuelve al cuerpo a cuerpo', 2500);
        }
        return true;
      }
    }
    const enemy = this.enemies.find((target) => target.hp > 0 &&
      Phaser.Geom.Intersects.LineToRectangle(path, target.anchor.getBounds()));
    if (!enemy) return false;
    this.hurtEnemy(enemy, enemy === this.boss ? Math.ceil(shot.damage * .53) : shot.damage);
    return true;
  }

  private hostileImpact(shot: Shot, path: Phaser.Geom.Line): boolean {
    if (!Phaser.Geom.Intersects.LineToRectangle(path, this.anchor.getBounds())) return false;
    this.damagePlayer(shot.damage);
    return true;
  }

  private shieldCenter(): Target {
    const x = this.boss!.anchor.x;
    return { x: Phaser.Math.Clamp(x - 94, ARENA.entrance + 95, ARENA.exit - 85), y: WORLD.floor - 92 };
  }

  private renderCore(): void {
    const g = this.core.clear();
    if (!this.boss && !this.run.bossDefeated && this.zone === KEEP_ZONE) {
      this.boss = this.makeEnemy('boss', ARENA.boss, BOSS_HP);
      this.enemies.push(this.boss);
      this.gate(this.bossGate, true);
      this.notice('Centinela del Umbral · esquiva o desvía sus golpes', 2800);
    }
    if (this.shield === 0) return;
    const { x, y } = this.shieldCenter();
    g.fillStyle(0x1b5f8a, .67).fillCircle(x, y, 34);
    g.lineStyle(2, 0x8fdfff, .8).strokeCircle(x, y, 34 + Math.sin(this.now / 125) * 4);
    g.fillStyle(0xd5fcff).fillCircle(x, y, 12);
    g.lineStyle(2, 0x65b9f5, .48).lineBetween(x, y, this.boss!.anchor.x, this.boss!.anchor.y);
  }

  private renderHero(): void {
    const { x, y } = this.anchor;
    const swing = this.now < this.meleeEnd;
    const dashing = this.now < this.dashEnd;
    const running = Math.abs(this.body.velocity.x) > 60;
    const step = running ? Math.sin(this.now / 55) : 0;
    const texture = this.frenzied ? 'frenzy' : swing ? 'strike' : running ? 'running' : this.weapon ? 'armored' : 'human';
    const poseHeight = this.frenzied ? 105 : texture === 'strike' ? 78 : 86;
    this.hero.setTexture(texture).setScale(poseHeight / this.hero.height).setFlipX(this.facing < 0)
      .setPosition(x + (swing && !this.frenzied ? this.facing * 15 : 0), this.body.bottom + step * 2)
      .setAlpha(this.now < this.invulnerable && Math.floor(this.now / 62) % 2 === 0 ? .57 : 1);
    const g = this.effects.clear();
    const feet = this.body.bottom;

    // Sombra de contacto: ancla al personaje al suelo.
    g.fillStyle(0x04070c, 0.45).fillEllipse(x, feet, 44, 10);

    if (this.frenzied || dashing) {
      g.fillStyle(this.frenzied ? 0xf674b6 : 0x53dce2, 0.32)
        .fillEllipse(x - (dashing ? this.facing * 30 : 0), y, dashing ? 116 : 87, 55);
    }
    if (swing) {
      g.lineStyle(this.frenzied ? 8 : 5, this.frenzied ? 0xff90c7 : 0x9bfafa, 0.85).beginPath();
      const angle = this.facing > 0 ? 0 : Math.PI;
      g.arc(x, y, this.frenzied ? 88 : 69, angle - 0.7, angle + 0.7).strokePath();
    }

    // Escudo de parry: doble anillo y arcos giratorios durante la ventana.
    if (this.now < this.parryEnd) {
      const pulse = 1 + Math.sin(this.now / 40) * 0.04;
      const radius = 41 * pulse;
      g.lineStyle(9, 0x2f7f86, 0.3).strokeCircle(x, y, radius + 1);
      g.lineStyle(3, 0xcafff8, 1).strokeCircle(x, y, radius);
      g.lineStyle(1, 0xffffff, 0.9).strokeCircle(x, y, radius - 3);
      g.lineStyle(4, 0xffffff, 0.7);
      for (let i = 0; i < 3; i++) {
        const start = this.now / 520 + i * (Math.PI * 2 / 3);
        g.beginPath();
        g.arc(x, y, radius + 6, start, start + 0.55);
        g.strokePath();
      }
    } else if (this.parryFlash > this.now) {
      g.lineStyle(3, 0xffffff, 0.7).strokeCircle(x, y, 46);
    }

    // Recarga de cargas de parry alrededor del personaje.
    if (this.parries < BALANCE.parries) {
      const p = Phaser.Math.Clamp(1 - (this.nextCharge - this.now) / BALANCE.parryRecharge, 0, 1);
      g.lineStyle(2, 0x4c7f8e, 0.55);
      g.beginPath();
      g.arc(x, y, 52, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
      g.strokePath();
    }

    // Núcleo del armazón latiendo en el pecho.
    if (this.weapon && !this.frenzied) {
      const glow = 0.45 + Math.sin(this.now / 180) * 0.2;
      g.fillStyle(WEAPONS[this.weapon].color, glow).fillCircle(x + this.facing * 3, feet - 46, 3.4);
    }

    // Estela del dash.
    if (dashing && this.now >= this.nextGhost) {
      this.nextGhost = this.now + 45;
      const ghost = this.add.image(this.hero.x, this.hero.y, this.hero.texture.key)
        .setOrigin(this.hero.originX, this.hero.originY)
        .setScale(this.hero.scaleX, this.hero.scaleY)
        .setFlipX(this.hero.flipX)
        .setTint(0x53dce2)
        .setAlpha(0.34)
        .setDepth(7);
      this.tweens.add({ targets: ghost, alpha: 0, duration: 240, onComplete: () => ghost.destroy() });
    }

    const aim = this.aimArt.clear();
    if (!this.weapon || this.frenzied) return;
    this.input.activePointer.positionToCamera(this.cameras.main, this.aim);
    const angle = Phaser.Math.Angle.Between(x, y - 10, this.aim.x, this.aim.y);
    const color = WEAPONS[this.weapon].color;
    aim.lineStyle(6, 0x172238).lineBetween(x, y - 10, x + Math.cos(angle) * 30, y - 10 + Math.sin(angle) * 30);
    aim.lineStyle(2, color).lineBetween(x, y - 10, x + Math.cos(angle) * 29, y - 10 + Math.sin(angle) * 29);
    aim.lineStyle(1.5, color, .94).strokeCircle(this.aim.x, this.aim.y, 9)
      .lineBetween(this.aim.x - 13, this.aim.y, this.aim.x - 5, this.aim.y)
      .lineBetween(this.aim.x + 5, this.aim.y, this.aim.x + 13, this.aim.y);
  }

  /** Aviso de ataque diferenciado por tipo de enemigo (GDD §6.1). */
  private drawTelegraph(enemy: Enemy, windup: number, parryMoment: boolean, color: number): void {
    if (enemy.phase !== 'windup') return;
    const g = enemy.art;
    const boss = enemy.kind === 'boss';
    const cy = boss ? -86 : -46;

    // Anillo que se cierra sobre el enemigo.
    const radius = Phaser.Math.Linear(54, 31, windup);
    g.lineStyle(2, color, parryMoment ? 0.95 : 0.32 + windup * 0.45);
    g.strokeCircle(0, cy, radius);

    // Arco brillante en el instante exacto del parry.
    if (parryMoment) {
      g.lineStyle(4, 0xffffff, 0.9);
      g.beginPath();
      g.arc(0, cy, radius + 5, -Math.PI / 2 - 0.75, -Math.PI / 2 + 0.75);
      g.strokePath();
    }

    // Marca en el suelo: los jefes avisan con un anillo más amplio.
    g.lineStyle(2, color, 0.18 + windup * 0.3);
    g.strokeEllipse(0, -3, (boss ? 62 : 44) + windup * 22, (boss ? 14 : 10) + windup * 5);

    // El tirador traza su línea de mira antes de disparar.
    if (enemy.kind === 'shooter') {
      const lx = (this.anchor.x - enemy.anchor.x) * enemy.facing;
      const ly = this.anchor.y - 10 - enemy.body.bottom;
      g.lineStyle(1, color, 0.16 + windup * 0.4);
      g.lineBetween(8, -50, lx, ly);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Efectos                                                            */
  /* ------------------------------------------------------------------ */

  private parryBurst(x: number, y: number): void {
    this.shockwave(x, y, 0xbafff9, 1.9);
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 26 + Math.random() * 64;
      const spark = this.add.rectangle(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3, 0xd8fffb, 0.95)
        .setDepth(30).setRotation(angle);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 260 + Math.random() * 220,
        ease: 'Cubic.out',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private shieldSpark(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const spark = this.add.rectangle(x, y, 2, 2, 0x9bfafa, 0.9).setDepth(30);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * (16 + Math.random() * 22),
        y: y + Math.sin(angle) * (16 + Math.random() * 22),
        alpha: 0,
        duration: 220 + Math.random() * 160,
        ease: 'Quad.out',
        onComplete: () => spark.destroy(),
      });
    }
  }

  private shockwave(x: number, y: number, color: number, scale: number): void {
    const ring = this.add.circle(x, y, 20, 0x000000, 0)
      .setStrokeStyle(3, color, 0.95).setDepth(29).setScale(0.45);
    this.tweens.add({
      targets: ring,
      scale,
      alpha: 0,
      duration: 320,
      ease: 'Cubic.out',
      onComplete: () => ring.destroy(),
    });
  }

  private floatText(x: number, y: number, text: string, color: number, size: number): void {
    const label = this.add.text(x, y, text, {
      fontFamily: 'Consolas, monospace',
      fontSize: size + 'px',
      color: '#' + color.toString(16).padStart(6, '0'),
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(31)
      .setStroke('#06101a', 3)
      .setShadow(0, 2, '#000000', 5, true, true);
    this.tweens.add({
      targets: label,
      y: y - 42,
      duration: 700,
      ease: 'Cubic.out',
    });
    this.tweens.add({
      targets: label,
      alpha: 0,
      delay: 300,
      duration: 380,
      onComplete: () => label.destroy(),
    });
  }

  /** Motas de polvo bioluminiscente para dar vida a las galerías. */
  private createAmbience(): void {
    for (let i = 0; i < 26; i++) {
      const x = Phaser.Math.Between(0, WORLD.width);
      const y = Phaser.Math.Between(140, WORLD.floor - 30);
      const mote = this.add
        .circle(x, y, Phaser.Math.FloatBetween(0.9, 1.9), 0x9fe8f0, Phaser.Math.FloatBetween(0.1, 0.32))
        .setDepth(-5)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: mote,
        y: y - Phaser.Math.Between(50, 120),
        x: x + Phaser.Math.Between(-50, 50),
        alpha: 0.05,
        duration: Phaser.Math.Between(4200, 9000),
        delay: Phaser.Math.Between(0, 3200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }

  private renderHud(): void {
    const marker = this.nearbyMarker();
    const boss = this.boss;
    this.hud.render({
      life: this.hp,
      energy: this.energy,
      frenzy: this.frenzied ? (this.frenzyEnd - this.now) / BALANCE.frenzyDuration : this.frenzy,
      frenzyActive: this.frenzied,
      parries: this.parries,
      injectors: this.injectors,
      weapon: this.frenzied ? 'ARMAZÓN INACTIVO' : this.weapon ? 'ARMAZÓN / ' + WEAPONS[this.weapon].label.toUpperCase() : 'ENERGÍA BIOLÓGICA',
      zone: ZONES[this.zone].name,
      hint: this.now < this.messageEnd ? this.message : marker?.label ?? ZONES[this.zone].hint,
      boss: boss && boss.hp > 0 ? boss.hp / boss.maxHp : null,
      shield: this.shield,
    });
  }

  private notice(text: string, length = 1250): void {
    this.message = text;
    this.messageEnd = this.now + length;
  }
}

