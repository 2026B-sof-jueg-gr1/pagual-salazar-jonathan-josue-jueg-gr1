import Phaser from 'phaser';
import { VIEW, ZONES } from './level';
import { TwinUsScene } from './TwinUsScene';

const menu = document.querySelector<HTMLElement>('#menu')!;
const title = document.querySelector<HTMLElement>('#menu-title')!;
const description = document.querySelector<HTMLElement>('#menu-description')!;
const regions = document.querySelector<HTMLOListElement>('#region-list')!;
const play = document.querySelector<HTMLButtonElement>('#play')!;
const showMap = document.querySelector<HTMLButtonElement>('#map')!;
const restart = document.querySelector<HTMLButtonElement>('#restart')!;
const host = document.querySelector<HTMLElement>('#game')!;

const scene = new TwinUsScene((mode, visited) => {
  menu.hidden = mode === 'playing';
  if (mode === 'playing') { host.focus(); return; }
  const copy = {
    title: ['TwinUs', 'Dos conciencias. Un cuerpo. Un destino.', 'Iniciar demo'],
    pause: ['Pausa', 'Puedes consultar los controles debajo de la pantalla.', 'Reanudar'],
    map: ['Regiones descubiertas', 'El camino comienza en el subsuelo profundo.', 'Volver al juego'],
    victory: ['Umbral superado', 'El Centinela ha caído. El camino hacia la siguiente región está abierto.', 'Jugar otra vez'],
  }[mode];
  [title.textContent, description.textContent, play.textContent] = copy;
  const displayingMap = mode === 'map';
  regions.hidden = !displayingMap;
  if (displayingMap) {
    regions.replaceChildren(...ZONES.map((zone, index) => {
      const region = document.createElement('li');
      region.textContent = index <= visited ? zone.name : 'Por descubrir';
      region.classList.toggle('locked', index > visited);
      return region;
    }));
  }
  play.disabled = false;
  play.onclick = mode === 'victory' ? () => scene.restart() : () => scene.start();
  restart.hidden = mode !== 'pause';
  showMap.hidden = mode !== 'pause';
  play.focus();
});

showMap.onclick = () => scene.openMap();
restart.onclick = () => scene.restart();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: host,
  width: VIEW.width,
  height: VIEW.height,
  backgroundColor: '#111b2b',
  scene: [scene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: false, pixelArt: true, roundPixels: true },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1120 } } },
  banner: false,
});

game.canvas?.setAttribute('aria-hidden', 'true');
if (import.meta.env.DEV) Object.assign(window, { twinUsGame: game });

