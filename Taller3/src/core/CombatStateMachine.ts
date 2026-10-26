/**
 * Máquina de estados genérica y mínima para el combate.
 *
 * Diseño:
 *  - Cada estado declara `onEnter`, `onUpdate` y `onExit` (todos opcionales).
 *  - `update(delta)` avanza el tiempo acumulado del estado actual.
 *  - Las transiciones son inmediatas y notifican al estado saliente/entrante.
 *
 * Se usa `delta` (ms) en lugar de timers de Phaser para poder escalarlo
 * durante el "hitstop" y para que el ritmo sea independiente del framerate.
 */

export interface StateDefinition<S extends string> {
  /** Se ejecuta al entrar. `from` es null en el estado inicial. */
  onEnter?: (from: S | null, elapsedInPrevious: number) => void;
  /** Se ejecuta cada frame con el delta escalado y el tiempo en el estado. */
  onUpdate?: (delta: number, elapsed: number) => void;
  /** Se ejecuta al salir, antes de entrar al siguiente estado. */
  onExit?: (to: S) => void;
}

export type StateMap<S extends string> = Record<S, StateDefinition<S>>;

export class CombatStateMachine<S extends string> {
  private readonly states: StateMap<S>;
  private currentState: S;
  private timeInState = 0;

  /** Historial corto, útil para depurar el ritmo del combate. */
  readonly history: S[] = [];

  constructor(initial: S, states: StateMap<S>) {
    this.states = states;
    this.currentState = initial;
    this.states[initial].onEnter?.(null, 0);
    this.history.push(initial);
  }

  /** Estado actual. */
  get state(): S {
    return this.currentState;
  }

  /** Tiempo (ms) acumulado en el estado actual. */
  get elapsed(): number {
    return this.timeInState;
  }

  /** Progreso normalizado 0..1 del estado actual respecto a `duration`. */
  progress(duration: number): number {
    if (duration <= 0) return 1;
    return Math.min(1, this.timeInState / duration);
  }

  /** `true` si el estado actual es alguno de los indicados. */
  is(...states: S[]): boolean {
    return states.includes(this.currentState);
  }

  /** Cambia de estado. Devuelve `false` si ya estaba en ese estado. */
  transition(next: S): boolean {
    if (next === this.currentState) return false;

    const previous = this.currentState;
    const elapsedInPrevious = this.timeInState;

    this.states[previous].onExit?.(next);
    this.currentState = next;
    this.timeInState = 0;
    this.states[next].onEnter?.(previous, elapsedInPrevious);

    this.history.push(next);
    if (this.history.length > 24) this.history.shift();

    return true;
  }

  /** Reinicia el estado actual sin salir de él (útil al reaparecer). */
  reset(): void {
    this.timeInState = 0;
  }

  /** Avanza la máquina. `delta` en milisegundos. */
  update(delta: number): void {
    this.timeInState += delta;
    this.states[this.currentState].onUpdate?.(delta, this.timeInState);
  }
}
