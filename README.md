# TwinUs

Metroidvania 2D de acción biomecánica para navegador. El MVP empieza en la Colonia Profunda y termina al atravesar el acceso que protege el Centinela del Umbral. Se juega con teclado y ratón.

## Desarrollo local

Con Node.js 24, ejecuta desde la raíz del repositorio:

```sh
cd Taller3
npm ci
npm run dev:twinus
```

Abre <http://127.0.0.1:5179/>. Los controles están debajo de la pantalla del juego y en la landing.

## Vista previa del despliegue

Desde `Taller3`:

```sh
npm run build:site
npm run preview:site
```

Abre <http://localhost:4173/> y pulsa **Jugar demo**. El sitio estático se genera en `Taller3/dist-site/`, con la landing en la raíz del sitio y la demo en `jugar/`.

## GitHub Pages

El sitio se publica desde la **raíz de `main`** (Settings → Pages → Build and deployment → Source: **Deploy from a branch** · Branch: `main` · carpeta **/(root)**).

Al hacer push a `main`, el workflow [Publicar TwinUs en GitHub Pages](.github/workflows/deploy.yml) compila la landing y la demo, copia el resultado a la raíz del repositorio y lo confirma con `[skip ci]`. No hace falta ejecutar nada a mano.

Para publicar en local:

```sh
cd Taller3
npm run publish:pages   # build:site + copia dist-site/ a la raíz
```

La [página del proyecto](https://2026b-sof-jueg-gr1.github.io/pagual-salazar-jonathan-josue-jueg-gr1/) sirve la landing en la raíz y la demo en `jugar/`, con rutas relativas.

> El repositorio se renombró de `...jueg-gr3` a `...jueg-gr1`, así que la URL antigua ya no existe. Usa siempre la URL nueva.
