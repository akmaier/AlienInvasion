import { createGameCommands } from './GameCommands.js';

const KEY_LEFT = 'ArrowLeft';
const KEY_RIGHT = 'ArrowRight';
const KEY_A = 'KeyA';
const KEY_D = 'KeyD';
const KEY_SPACE = 'Space';
const KEY_ENTER = 'Enter';
const KEY_H = 'KeyH';

/**
 * KeyboardHandler - translates raw keyboard events into canonical GameCommands.
 *
 * Registers global keydown/keyup listeners on `window`, tracks pressed keys,
 * and emits GameCommands objects. Held keys (left/right) stay true until
 * released; edge flags (fire, confirm, highscoreToggle) are true for exactly
 * one frame after the key goes down, then cleared until release and press
 * again. This implements "only one projectile per key press" (UC-001).
 *
 * Owns no game state; it only maps input to intent.
 */
export class KeyboardHandler {
  /** @type {Set<string>} physical key codes currently held down */
  pressedKeys;
  /** @type {Set<string>} key codes that went down since the last getCommands() call */
  justPressed;
  #boundOnKeyDown;
  #boundOnKeyUp;
  #connected = false;

  constructor() {
    this.pressedKeys = new Set();
    this.justPressed = new Set();
    this.#boundOnKeyDown = this.onKeyDown.bind(this);
    this.#boundOnKeyUp = this.onKeyUp.bind(this);
  }

  /**
   * Attaches the global keydown/keyup listeners to `window` (once).
   */
  connect() {
    if (this.#connected) return;
    window.addEventListener('keydown', this.#boundOnKeyDown);
    window.addEventListener('keyup', this.#boundOnKeyUp);
    this.#connected = true;
  }

  /**
   * Removes the listeners and clears key state.
   */
  disconnect() {
    if (!this.#connected) return;
    window.removeEventListener('keydown', this.#boundOnKeyDown);
    window.removeEventListener('keyup', this.#boundOnKeyUp);
    this.#connected = false;
    this.pressedKeys.clear();
    this.justPressed.clear();
  }

  /**
   * Called by the keydown listener.
   * @param {KeyboardEvent} event
   */
  onKeyDown(event) {
    const code = event.code;

    // Spacebar gets preventDefault() to avoid page scroll; arrow keys do not.
    if (code === KEY_SPACE && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    // Ignore key repeats while a key is held: a key counts as pressed only on
    // the transition from not-pressed to pressed.
    if (this.pressedKeys.has(code)) return;

    this.pressedKeys.add(code);
    this.justPressed.add(code);
  }

  /**
   * Called by the keyup listener.
   * @param {KeyboardEvent} event
   */
  onKeyUp(event) {
    this.pressedKeys.delete(event.code);
  }

  /**
   * Returns the GameCommands for the current frame. Edge flags are true for
   * exactly one frame after the key goes down, then cleared until the key is
   * released and pressed again. Held keys stay true until released.
   *
   * @returns {GameCommands}
   */
  getCommands() {
    const commands = createGameCommands({
      left: this.pressedKeys.has(KEY_LEFT) || this.pressedKeys.has(KEY_A),
      right: this.pressedKeys.has(KEY_RIGHT) || this.pressedKeys.has(KEY_D),
      fire: this.justPressed.has(KEY_SPACE),
      confirm:
        this.justPressed.has(KEY_SPACE) || this.justPressed.has(KEY_ENTER),
      highscoreToggle: this.justPressed.has(KEY_H),
    });
    this.justPressed.clear();
    return commands;
  }
}
