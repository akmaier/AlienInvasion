/**
 * ScoreCounter - the player's score. Increments by exactly one per destroyed
 * alien (SCORE INCREMENT).
 */
export class ScoreCounter {
  constructor() {
    this.value = 0;
  }

  increment() {
    this.value += 1;
  }

  get() {
    return this.value;
  }

  reset() {
    this.value = 0;
  }
}
