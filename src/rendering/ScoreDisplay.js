/**
 * ScoreDisplay - shows the current score in a dedicated DOM element
 * (SCORE DISPLAY, UC-005). Purely presentational.
 */
export class ScoreDisplay {
  constructor(element) {
    this.element = element;
  }

  /** @param {number} score */
  update(score) {
    this.element.textContent = `Score: ${score}`;
  }
}
