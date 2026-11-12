/**
 * InitialsPrompt - prompts the player for up to three initials after a game
 * ends, then forwards them to the game session (SESSION HIGHSCORE DATA,
 * UC-006 A1: empty or cancelled initials become "AAA").
 */
export class InitialsPrompt {
  constructor(element) {
    this.element = element;
    this.callback = null;
  }

  /** @param {(initials: string) => void} callback */
  show(callback) {
    this.callback = callback;
    this.element.classList.add('show');
    // Give the input focus so typed initials go straight into the field.
    const input = this.element.querySelector('#initials-input');
    if (input && typeof input.focus === 'function') {
      input.focus();
    }
  }

  hide() {
    this.callback = null;
    this.element.classList.remove('show');
    const input = this.element.querySelector('#initials-input');
    if (input && typeof input.blur === 'function') {
      input.blur();
    }
  }

  /** Reads the typed initials from the input and hands them to the callback. */
  submit() {
    const input = this.element.querySelector('#initials-input');
    const raw = input ? input.value : this.element.value;
    const initials = String(raw || '').slice(0, 3) || 'AAA';
    if (this.callback) {
      this.callback(initials);
    }
    this.hide();
  }
}
