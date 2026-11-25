/// <reference types="vite/client" />
import Phaser from 'phaser';
import worldArt from '../../../landing/assets/art/mundo.jpg';
import human from '../../twinus/art/human.png';
import armored from '../../twinus/art/armored.png';
import running from '../../twinus/art/running.png';
import strike from '../../twinus/art/strike.png';
import frenzy from '../../twinus/art/frenzy.png';
import { PLATFORMS, VIEW, WORLD } from './level';

export function loadArt(scene: Phaser.Scene): void {
  for (const [key, src] of Object.entries({ worldArt, human, armored, running, strike, frenzy })) {
    scene.load.image(key, src);
  }
}

export function drawWorld(scene: Phaser.Scene): void {
  for (let x = 0; x < WORLD.width; x += 1200) {
    scene.add.image(x, 0, 'worldArt').setOrigin(0).setDisplaySize(1201, 701).setScrollFactor(.43, .65).setDepth(-10);
  }
  scene.add.rectangle(0, 0, VIEW.width, VIEW.height, 0x050912, .44)
    .setOrigin(0).setScrollFactor(0).setDepth(-9);
  const terrain = scene.add.graphics().setDepth(-2);
  for (const { x, y, w, h } of PLATFORMS) {
    const imperial = x >= 2160;
    terrain.fillStyle(imperial ? 0x201827 : 0x142733).fillRect(x, y, w, h);
    terrain.fillStyle(imperial ? 0x794b65 : 0x478495).fillRect(x, y, w, 4);
    terrain.fillStyle(imperial ? 0x372b40 : 0x254854).fillRect(x, y + 4, w, 13);
    for (let offset = 12; offset < w - 14; offset += 42) {
      terrain.fillStyle(imperial ? 0x564058 : 0x326070).fillRect(x + offset, y + 7, 22, 3);
      if (h > 30 && offset % 3 === 0) {
        terrain.fillStyle(0x0a141f, .72).fillRect(x + offset, y + 23, 5, 66);
      }
    }
  }
  for (const x of [340, 870, 1580, 2310, 2540, 3090, 3480]) {
    const color = x < 2300 ? 0x56d7df : 0xf475a7;
    scene.add.rectangle(x, 307, 11, 116, 0x152332, .9).setDepth(-3);
    scene.add.rectangle(x, 270, 6, 28, color, .74).setDepth(-3);
  }
}

export type EnemyKind = 'aggressor' | 'shooter' | 'boss';

export function drawEnemy(art: Phaser.GameObjects.Graphics, kind: EnemyKind, facing: number, accent: number, stride: number): void {
  const boss = kind === 'boss';
  const shooter = kind === 'shooter';
  const scale = boss ? 1.58 : 1;
  const width = shooter ? 21 : 18;
  art.clear().setScale(facing * scale, scale);
  art.fillStyle(0x050a13, .78).fillEllipse(0, 1, 56, 12);
  art.fillStyle(0x131019).fillRect(-width - 2, -58, width * 2 + 4, 43);
  art.fillStyle(0x3f3a50).fillRect(-width, -55, width * 2, 31);
  art.fillStyle(0x625872).fillRect(-width - 7, -54, 14, 13).fillRect(width - 6, -53, 15, 15);
  art.fillStyle(0x292741).fillRect(-16, -25, 13, 22 + stride).fillRect(4, -25, 12, 22 - stride);
  art.fillStyle(0x586078).fillRect(-17, -8 + stride, 17, 7).fillRect(4, -9 - stride, 17, 7);
  art.fillStyle(0x171628).fillRect(-13, -73, 29, 22);
  art.fillStyle(0x676074).fillRect(-7, -77, 22, 8).fillRect(5, -72, 12, 16);
  art.fillStyle(accent).fillRect(4, -67, 15, 5).fillRect(-5, -45, 12, 9);
  if (shooter) {
    art.fillStyle(0x232c49).fillRect(12, -47, 34, 14);
    art.fillStyle(accent).fillRect(35, -43, 12, 4);
  } else {
    art.fillStyle(0x52455d).fillRect(17, -44, 11, 27);
    art.fillStyle(accent, .92).fillTriangle(23, -21, 30, -28, 44, -51);
    if (boss) {
      art.fillStyle(0x76607c).fillTriangle(-21, -50, -34, -76, -5, -53);
      art.fillStyle(0x76607c).fillTriangle(14, -53, 25, -77, 26, -52);
    }
  }
}

