# PARRY — Prototipo de reacción y ritmo

Juego de duelo 1v1 centrado **exclusivamente en la mecánica de parry**: el rival
telegrafía un golpe, tú desvías en el instante exacto. Ni ataque, ni movimiento,
ni esquiva: solo tiempo.

Hecho con **Phaser 3 + TypeScript + Vite** (ES Modules). Todo el arte se genera
por código en tiempo de ejecución, así que no hay assets externos.

---

## Cómo jugar

| Acción | Tecla |
| --- | --- |
| Parry | `E` **o** clic izquierdo |
| Reiniciar | `R` (o clic en la pantalla de derrota) |

1. El rival se acerca y **carga** el golpe (la retícula se cierra sobre ti).
2. Cuando la retícula se pone **blanca y estalla**, la ventana está abierta.
3. Pulsa en ese instante: el golpe se desvía, el rival recibe daño y queda
   aturdido.
4. Si te **adelantas**, quedas bloqueado ~420 ms y el filo te alcanza igual.

Cada rival derrotado acelera el siguiente: menos telegrafiado, ventana más
estrecha, más vida y más daño. La partida acaba cuando tu vida llega a 0.

---

## Ejecutar en local

```bash
cd Taller3
npm install
npm run dev      # http://127.0.0.1:5178
```

```bash
npm run build    # comprueba tipos (tsc) y genera dist/
npm run preview  # sirve el build de producción
```

---

## Estructura

```
Taller3/
├── index.html                 # contenedor del canvas + tipografías
├── vite.config.ts             # base './' (rutas relativas → GitHub Pages)
├── scripts/publish-root.mjs   # copia dist/ a la raíz del repo para Pages
└── src/
    ├── main.ts                # configuración de Phaser (Scale.FIT 16:9)
    ├── types.ts               # CombatState, Palette, EnemyProfile…
    ├── config/GameConfig.ts   # ⚙️ TODO EL BALANCE AQUÍ
    ├── core/
    │   └── CombatStateMachine.ts   # FSM genérica (onEnter/onUpdate/onExit)
    ├── entities/
    │   ├── Fighter.ts         # base: contenedor, arma, respiración, muerte
    │   ├── Player.ts          # parry, whiff, lockout, vida
    │   └── Enemy.ts           # FSM de ataque + ventana de parry + dificultad
    ├── gfx/
    │   ├── TextureFactory.ts  # sprites procedurales (luchadores, armas, FX)
    │   └── Backdrop.ts        # cielo, luna, montañas, suelo, brasas
    ├── ui/
    │   ├── HealthBar.ts       # barra con capa "chip" de daño reciente
    │   ├── Hud.ts             # marcador, avisos, título, game over
    │   └── theme.ts           # fuentes y colores de UI
    ├── audio/Sfx.ts           # sonido sintetizado (Web Audio, sin ficheros)
    └── scenes/MainScene.ts    # orquesta todo el duelo
```

---

## Máquina de estados del combate

```
        ┌──────────────────────────── parry ────────────────────────────┐
        │                                                               ▼
     IDLE ──► WINDUP ──────────► ATTACK_ACTIVE ──► HIT ──► COOLDOWN ──► IDLE
               │  (telegrafiado)      │ (el golpe vuela)
               │                      │
               └── se abre la ventana┘  si no hay parry → daño al jugador
```

| Estado | Qué ocurre |
| --- | --- |
| `IDLE` | El rival espera (`ENEMY_IDLE_TIME`, baja con la ronda). |
| `WINDUP` | Carga el arma, crece el aura y la retícula se cierra. En `windup - parryWindow` **se abre la ventana**. |
| `ATTACK_ACTIVE` | El golpe está en el aire. Al terminar `PARRY_GRACE_AFTER` se resuelve el daño. |
| `HIT` | Reacción: stagger si le desviaron, recuperación si conectó. |
| `COOLDOWN` | Pausa antes de volver a `IDLE`. |

La ventana real es `[impacto − parryWindow, impacto + PARRY_GRACE_AFTER]`.
Si pulsas dentro → daño al rival, flash, sacudida, hitstop y chispas.
Si pulsas fuera → `FAILED_PARRY_LOCKOUT` (castigo anti-spam) y el golpe entra.

**Parry perfecto:** acertar en el tercio central de la ventana añade
`PERFECT_PARRY_BONUS` de daño y un feedback dorado.

---

## Ajustar el balance

Todo vive en `src/config/GameConfig.ts`:

```ts
BALANCE = {
  PLAYER_MAX_HP: 100,
  ENEMY_MAX_HP: 100,
  BASE_PARRY_WINDOW: 280,          // ms de ventana en la ronda 0
  WINDOW_DECREMENT_PER_ROUND: 26,  // se estrecha por rival derrotado
  MIN_PARRY_WINDOW: 90,            // suelo de dificultad
  PARRY_GRACE_AFTER: 90,           // indulgencia tras el impacto
  BASE_WINDUP: 950,                // telegrafiado inicial
  WINDUP_DECREMENT_PER_ROUND: 70,
  MIN_WINDUP: 280,
  PARRY_DAMAGE: 25,
  PERFECT_PARRY_BONUS: 9,
  FAILED_PARRY_LOCKOUT: 420,       // castigo por adelantarse
  PLAYER_HEAL_PER_WAVE: 12,
  ...
}
```

Y el roster en `ENEMY_ROSTER` (nombre, paleta, arma, silueta, corpulencia).
Al terminar la lista se repite el ciclo con la dificultad acumulada.

---

## Despliegue en GitHub Pages

El repositorio publica el **build en la raíz** (`index.html` + `assets/`), que es
lo que espera *Deploy from a branch → /(root)*.

```bash
cd Taller3
npm run publish:pages   # build + copia dist/ a la raíz + .nojekyll
cd ..
git add -A && git commit -m "build: publicar Taller3" && git push
```

Luego, en GitHub:

1. **Settings** → **Pages**.
2. *Source*: **Deploy from a branch**.
3. *Branch*: `main` · carpeta **/(root)** → **Save**.
4. Espera 1–2 minutos y recarga: aparecerá el enlace
   `https://<usuario>.github.io/<repo>/`.

`base: './'` en `vite.config.ts` hace que el build funcione igual en la raíz de
un dominio, en un subdirectorio de Pages o en localhost.

---

## Notas técnicas

- **Sin assets**: `TextureFactory` dibuja los sprites con `Graphics` y los
  hornea con `generateTexture()`. Cambiar una paleta regenera el personaje.
- **Sin ficheros de audio**: `Sfx` sintetiza el "clang" del parry, el impacto y
  el whoosh con osciladores y ruido filtrado.
- **Timing con `delta`**: la FSM avanza con el delta escalado, lo que permite el
  *hitstop* (`tweens.timeScale = 0.12`) sin romper el ritmo.
- **Escalado**: lienzo lógico 1280×720 con `Scale.FIT` + `CENTER_BOTH`.
