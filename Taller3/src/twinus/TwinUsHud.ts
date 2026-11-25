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

export class TwinUsHud {
  private readonly art: Phaser.GameObjects.Graphics;
  private readonly life: Phaser.GameObjects.Text;
  private readonly charges: Phaser.GameObjects.Text;
  private readonly energy: Phaser.GameObjects.Text;
  private readonly frenzy: Phaser.GameObjects.Text;
  private readonly zone: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly boss: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.art = scene.add.graphics().setScrollFactor(0).setDepth(100);
    const label = (x: number, y: number, align = 0, color = '#dceaf4') =>
      scene.add.text(x, y, '', {
        fontFamily: 'Consolas, monospace', fontSize: '13px', color, fontStyle: 'bold',
      }).setOrigin(align, 0).setScrollFactor(0).setDepth(101);
    this.life = label(25, 19);
    this.charges = label(25, 54);
    this.energy = label(25, 481, 0, '#8efbf4');
    this.frenzy = label(360, 481, 0, '#ffadd1');
    this.zone = label(VIEW.width - 25, 22, 1);
    this.hint = label(VIEW.width / 2, 84, .5);
    this.boss = label(VIEW.width / 2, 19, .5, '#ffb9cf');
  }

  render(state: HudState): void {
    const g = this.art.clear();
    const panel = (x: number, y: number, w: number, h: number) => {
      g.fillStyle(0x080e1a, .91).fillRoundedRect(x, y, w, h, 6);
      g.lineStyle(1, 0x83b5cc, .26).strokeRoundedRect(x, y, w, h, 6);
    };
    const bar = (x: number, y: number, w: number, value: number, color: number) => {
      g.fillStyle(0x263548).fillRect(x, y, w, 7);
      g.fillStyle(color).fillRect(x, y, w * Phaser.Math.Clamp(value, 0, 1), 7);
    };
    panel(13, 10, 224, 69);
    bar(25, 41, 200, state.life / BALANCE.life, 0x77ded4);
    this.life.setText('VIDA  ' + Math.ceil(state.life) + ' / ' + BALANCE.life);
    this.charges.setText('PARRY  ' + '◆'.repeat(state.parries) + '◇'.repeat(BALANCE.parries - state.parries));
    for (let i = state.parries; i < BALANCE.parries; i++) {
      const x = 202 + i * 7;
      g.lineStyle(1, 0x182632).lineBetween(x, 41, x - 4, 48);
    }

    panel(13, 470, 284, 54);
    bar(25, 504, 260, state.energy / BALANCE.energy, 0x6ff6ee);
    this.energy.setText(state.weapon + '  ·  ' + Math.floor(state.energy) + '%');
    panel(348, 470, 264, 54);
    bar(360, 504, 240, state.frenzy, 0xf780b6);
    this.frenzy.setText((state.frenzyActive ? 'FRENESÍ ACTIVO' : 'FRENESÍ [C]') + '  ·  Q × ' + state.injectors);

    this.zone.setText(state.zone.toUpperCase());
    panel(VIEW.width - this.zone.width - 37, 11, this.zone.width + 24, 30);
    this.hint.setText(state.hint);
    if (state.hint) panel((VIEW.width - this.hint.width) / 2 - 12, 77, this.hint.width + 24, 31);

    this.boss.setVisible(state.boss !== null);
    if (state.boss !== null) {
      panel(315, 10, 330, 59);
      this.boss.setText(state.shield > 0 ? 'NÚCLEO IMPERIAL  ·  ' + state.shield + ' / 3' : 'CENTINELA DEL UMBRAL');
      bar(329, 43, 302, state.boss, state.shield > 0 ? 0x79c4ff : 0xda739e);
    }
  }
}

