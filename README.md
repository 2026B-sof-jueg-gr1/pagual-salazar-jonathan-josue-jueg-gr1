# Taller 3 — PARRYZ

Prototipo jugable de **juego de reacción y ritmo** centrado en una única
mecánica: el **parry** (desvío de ataques). El rival telegrafía un golpe y el
jugador debe pulsar en la ventana exacta antes del impacto.

Hecho con **Phaser 3 + TypeScript + Vite**, sin assets externos: los sprites, el
escenario y los efectos se generan por código.

> 🎮 **Demo:** https://2026b-sof-jueg-gr1.github.io/pagual-salazar-jonathan-josue-jueg-gr3/

---

## Controles

| Acción | Entrada |
| --- | --- |
| Parry | `E` **o** clic izquierdo |
| Reiniciar | `R` / clic tras la derrota |

- La retícula se cierra sobre ti mientras el rival carga → **se pone blanca y
  estalla** = ventana de parry abierta.
- Acertar: sin daño, daño al rival, flash + sacudida + chispas + hitstop.
- Adelantarse: bloqueo de ~420 ms y el golpe entra igual.
- Al vaciar la vida del rival entra el siguiente, más rápido y con ventana más
  estrecha. La partida termina cuando tu vida llega a 0.

---

## Contenido del repositorio

```
├── index.html          ← build publicado (lo que sirve GitHub Pages)
├── assets/             ← JS compilado del build
├── .nojekyll           ← evita el procesado de Jekyll en Pages
└── Taller3/            ← código fuente completo (TypeScript)
    ├── src/
    ├── index.html
    ├── package.json
    └── README.md       ← documentación técnica, balance y arquitectura
```

El código está modularizado en `scenes/`, `entities/`, `core/` (máquina de
estados), `gfx/`, `ui/`, `audio/` y `config/`. Todo el balance
(`BASE_PARRY_WINDOW`, `WINDOW_DECREMENT_PER_ROUND`, `PLAYER_MAX_HP`,
`ENEMY_MAX_HP`, `FAILED_PARRY_LOCKOUT`…) está expuesto en
`Taller3/src/config/GameConfig.ts`.

**Nombre del juego:** `GAME.TITLE` y `GAME.SUBTITLE` en ese mismo archivo
(portada). El título de la pestaña está en `Taller3/index.html`.

---

## Ejecutar en local

```bash
cd Taller3
npm install
npm run dev      # http://127.0.0.1:5178
```

## Regenerar el build publicado

```bash
cd Taller3
npm run publish:pages   # compila y copia dist/ a la raíz del repositorio
cd ..
git add -A && git commit -m "build: actualizar demo" && git push
```

---

## Publicación en GitHub Pages

1. En el repositorio: **Settings** → **Pages**.
2. *Source*: **Deploy from a branch**.
3. *Branch*: `main` · carpeta **/(root)** → **Save**.
4. Espera 1–2 minutos y recarga la página para ver el enlace activo.
