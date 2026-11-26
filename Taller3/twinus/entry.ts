/**
 * Punto de entrada del servidor de desarrollo.
 *
 * Vite usa `Taller3/twinus/` como raíz, así que el HTML no puede referenciar
 * directamente `../src/twinus/main.ts`: en dev esa ruta se resuelve como
 * `/src/twinus/main.ts` dentro de la raíz y no existe. Este archivo vive dentro
 * de la raíz e importa el código real, de modo que dev y build comparten entry.
 */
import '../src/twinus/main';
