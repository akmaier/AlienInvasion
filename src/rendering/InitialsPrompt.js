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
    this.element.style.display = '';
  }

  hide() {
    this.callback = null;
    this.element.style.display = 'none';
  }

  /** Reads the input and hands the initials to the callback. */
  submit() {
    const initials = (this.element.value || '').slice(0, 3) || 'AAA';
    if (this.callback) {
      this.callback(initials);
    }
    this.hide();
  }
}
