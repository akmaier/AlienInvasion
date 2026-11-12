/**
 * GameOverScreen - the Game-Over overlay: final score plus the session
 * highscore list (SESSION HIGHSCORE DISPLAY GAMEOVER, UC-004/UC-006).
 */
export class GameOverScreen {
  constructor(element) {
    this.element = element;
  }

  /**
   * @param {number} finalScore
   * @param {Array<{score:number,initials:string,timestamp:number}>} highscores
   */
  show(finalScore, highscores) {
    const list = highscores
      .map((e, i) => `<div>${i + 1}. ${e.initials} — ${e.score}</div>`)
      .join('');
    this.element.innerHTML = `<div class="game-over">Game Over</div><div>Final score: ${finalScore}</div><div class="highscore-list">${list}</div>`;
    this.element.style.display = '';
  }

  hide() {
    this.element.innerHTML = '';
    this.element.style.display = 'none';
  }
}
