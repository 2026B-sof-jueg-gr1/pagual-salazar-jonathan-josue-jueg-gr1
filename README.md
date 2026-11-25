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

En **Settings → Pages → Build and deployment → Source**, selecciona **GitHub Actions**. El workflow [Deploy TwinUs to GitHub Pages](.github/workflows/deploy.yml) genera y publica el sitio al subir cambios a `main`. También se puede ejecutar desde **Actions → Deploy TwinUs to GitHub Pages → Run workflow**.

La [página del proyecto](https://2026b-sof-jueg-gr1.github.io/pagual-salazar-jonathan-josue-jueg-gr1/) usa rutas relativas para cargar la landing y la demo bajo el nombre del repositorio.
