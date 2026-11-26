import Phaser from 'phaser';
import { BALANCE, VIEW } from './level';

export interface HudState {
  life: number;
  energy: number;
  frenzy: number;
  frenzyActive: boolean;
  parries: number;
  injectors: number;
  weapon: string;
  zone: string;
  hint: string;
  boss: number | null;
  shield: number;
}

/**
 * HUD del GDD §6.3: vida arriba a la izquierda con el escudo de parry
 * superpuesto (se agrieta al gastar cargas), energía abajo a la izquierda,
 * frenesí abajo al centro e inyectores debajo.
 */
export class TwinUsHud {
  private readonly art: Phaser.GameObjects.Graphics;
  private readonly life: Phaser.GameObjects.Text;
  private readonly charges: Phaser.GameObjects.Text;
  private readonly energy: Phaser.GameObjects.Text;
  private readonly frenzy: Phaser.GameObjects.Text;
  private readonly zone: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly boss: Phaser.GameObjects.Text;
  private readonly weaponLabel: Phaser.GameObjects.Text;
  private readonly injectLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.art = scene.add.graphics().setScrollFactor(0).setDepth(100);
    const label = (x: number, y: number, align = 0, color = '#dceaf4', size = '13px') =>
      scene.add.text(x, y, '', {
        fontFamily: 'Consolas, monospace', fontSize: size, color, fontStyle: 'bold',
      }).setOrigin(align, 0).setScrollFactor(0).setDepth(101);
    this.life = label(25, 17);
    this.charges = label(25, 58, 0, '#8ff6f0', '11px');
    this.energy = label(25, 481, 0, '#8efbf4', '12px');
    this.frenzy = label(360, 481, 0, '#ffadd1', '12px');
    this.zone = label(VIEW.width - 25, 22, 1, '#cfe3ef', '12px');
    this.hint = label(VIEW.width / 2, 84, 0.5);
    this.boss = label(VIEW.width / 2, 19, 0.5, '#ffb9cf');
    this.weaponLabel = label(260, 500, 0, '#8efbf4', '11px');
    this.injectLabel = label(594, 500, 0, '#80ffce', '11px');
  }

  render(state: HudState): void {
    const g = this.art.clear();
    const panel = (x: number, y: number, w: number, h: number) => {
      g.fillStyle(0x070d17, 0.92).fillRoundedRect(x, y, w, h, 6);
      g.lineStyle(1, 0x83b5cc, 0.24).strokeRoundedRect(x, y, w, h, 6);
      g.lineStyle(1, 0x65cbd6, 0.1).lineBetween(x + 6, y + 1, x + w - 6, y + 1);
    };
    const segments = (
      x: number, y: number, w: number, h: number, count: number,
      value: number, color: number, dim = 0x1d2c3e,
    ) => {
      const gap = 2;
      const step = w / count;
      for (let i = 0; i < count; i++) {
        const lit = value * count > i + 0.02;
        g.fillStyle(lit ? color : dim, lit ? 0.95 : 0.55);
        g.fillRect(x + i * step, y, Math.max(2, step - gap), h);
      }
    };

    /* ---------------- Vida + escudo de parry ---------------- */
    panel(13, 10, 246, 78);
    const ratio = Phaser.Math.Clamp(state.life / BALANCE.life, 0, 1);
    const lifeColor = ratio > 0.55 ? 0x77ded4 : ratio > 0.28 ? 0xe8b45c : 0xf06a7a;
    segments(25, 40, 190, 9, 20, ratio, lifeColor);
    this.life.setText('VIDA  ' + Math.ceil(state.life) + ' / ' + BALANCE.life);
    this.life.setColor(ratio > 0.28 ? '#dceaf4' : '#ffb3bf');

    const shield = [
      { x: 222, y: 18 },
      { x: 243, y: 18 },
      { x: 243, y: 34 },
      { x: 232.5, y: 44 },
      { x: 222, y: 34 },
    ];
    const missing = Math.max(0, BALANCE.parries - state.parries);
    g.fillStyle(missing === 0 ? 0x1f6b74 : 0x11293a, 0.95).fillPoints(shield, true);
    g.lineStyle(2, missing === 0 ? 0x8ff6f0 : 0x4c7f8e, missing === 0 ? 0.95 : 0.7).strokePoints(shield, true);
    if (missing === 0) {
      g.fillStyle(0xbafff9, 0.35).fillRect(226, 22, 13, 3);
    }
    const cracks = [
      [
        { x: 231, y: 19 }, { x: 227, y: 27 }, { x: 232, y: 33 }, { x: 229, y: 40 },
      ],
      [
        { x: 237, y: 18 }, { x: 240, y: 26 }, { x: 236, y: 31 },
      ],
      [
        { x: 226, y: 32 }, { x: 233, y: 35 }, { x: 240, y: 31 },
      ],
    ];
    for (let i = 0; i < missing && i < cracks.length; i++) {
      g.lineStyle(1.5, 0x0a1420, 0.9);
      g.beginPath();
      g.moveTo(cracks[i][0].x, cracks[i][0].y);
      for (const point of cracks[i].slice(1)) g.lineTo(point.x, point.y);
      g.strokePath();
    }

    const pips = '◆'.repeat(state.parries) + '◇'.repeat(missing);
    this.charges.setText('PARRY  ' + pips + (missing > 0 ? '  ·  RECARGANDO' : '  ·  LISTO'));
    this.charges.setColor(missing === 0 ? '#8ff6f0' : '#e8b45c');

    /* ---------------- Energía y arma ---------------- */
    panel(13, 470, 292, 58);
    segments(25, 506, 214, 8, 16, state.energy / BALANCE.energy, 0x6ff6ee);
    this.energy.setText('ENERGÍA  ·  ' + Math.floor(state.energy) + '%');
    const chip = this.weaponChip(state.weapon);
    g.fillStyle(0x0f2230, 0.9).fillRoundedRect(246, 496, 48, 22, 4);
    g.lineStyle(1, 0x65cbd6, 0.45).strokeRoundedRect(246, 496, 48, 22, 4);
    g.fillStyle(0x6ff6ee, 0.9).fillRect(252, 505, 4, 4);
    this.weaponLabel.setText(chip).setPosition(260, 500).setVisible(true);

    /* ---------------- Frenesí e inyectores ---------------- */
    panel(348, 470, 272, 58);
    const frenzyColor = state.frenzyActive ? 0xff5fa8 : state.frenzy >= 1 ? 0xf780b6 : 0x8c3f68;
    segments(360, 506, 176, 8, 16, state.frenzy, frenzyColor);
    this.frenzy.setText(state.frenzyActive ? 'FRENESÍ ACTIVO' : 'FRENESÍ [C]');
    this.frenzy.setColor(state.frenzyActive || state.frenzy >= 1 ? '#ffc2dd' : '#c98aa8');

    for (let i = 0; i < BALANCE.injectors; i++) {
      const x = 548 + i * 15;
      const on = i < state.injectors;
      g.fillStyle(on ? 0x80ffce : 0x1a2a33, on ? 0.95 : 0.6).fillRect(x, 505, 10, 10);
      g.lineStyle(1, on ? 0xbaffdf : 0x35505c, 0.8).strokeRect(x, 505, 10, 10);
    }
    this.injectLabel.setText('Q').setPosition(594, 500).setVisible(true);

    /* ---------------- Zona y aviso ---------------- */
    this.zone.setText(state.zone.toUpperCase());
    panel(VIEW.width - this.zone.width - 37, 11, this.zone.width + 24, 30);
    this.hint.setText(state.hint);
    if (state.hint) panel((VIEW.width - this.hint.width) / 2 - 12, 77, this.hint.width + 24, 31);

    /* ---------------- Jefe ---------------- */
    this.boss.setVisible(state.boss !== null);
    if (state.boss !== null) {
      panel(305, 10, 350, 64);
      const shieldPhase = state.shield > 0;
      this.boss.setText(shieldPhase
        ? 'CENTINELA  ·  NÚCLEO EXPUESTO  ' + state.shield + ' / 3'
        : 'CENTINELA DEL UMBRAL');
      segments(319, 46, 322, 9, 24, state.boss, shieldPhase ? 0x79c4ff : 0xda739e);
      g.fillStyle(0xffffff, 0.55).fillRect(319, 46, 322 * state.boss, 1);
    }
  }

  /** Etiqueta corta del arma para el chip. */
  private weaponChip(weapon: string): string {
    if (weapon.includes('LANZA')) return 'LZ';
    if (weapon.includes('PULSO')) return 'PL';
    if (weapon.includes('INACTIVO')) return '—';
    return '·';
  }
}
