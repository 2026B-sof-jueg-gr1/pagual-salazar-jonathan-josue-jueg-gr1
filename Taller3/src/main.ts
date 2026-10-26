import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';
import { VIEW } from './config/GameConfig';

/**
 * Punto de entrada.
 *
 * Escala `FIT` + `CENTER_BOTH`: el lienzo lógico siempre es 1280x720 y Phaser
 * lo adapta al tamaño de la ventana manteniendo la proporción (16:9).
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW.WIDTH,
  height: VIEW.HEIGHT,
  backgroundColor: '#05050c',
  scene: [MainScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    roundPixels: false,
    powerPreference: 'high-performance',
  },
  input: {
    mouse: { preventDefaultWheel: true },
  },
  banner: false,
};

function boot(): void {
  const game = new Phaser.Game(config);
  // Útil para depurar desde la consola del navegador.
  (window as unknown as { parryGame: Phaser.Game }).parryGame = game;
}

/**
 * Espera a que carguen las tipografías de Google Fonts para que los textos
 * no se dibujen con la fuente de reserva. Con un límite de 1.5s por si no hay
 * conexión (el juego debe arrancar igualmente).
 */
const fontReady: Promise<unknown> = document.fonts ? document.fonts.ready : Promise.resolve();
const timeout = new Promise((resolve) => window.setTimeout(resolve, 1500));

Promise.race([fontReady, timeout]).then(boot, boot);
