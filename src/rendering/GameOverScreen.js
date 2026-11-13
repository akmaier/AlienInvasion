/**
 * GameOverScreen - the Game-Over overlay: final score, the session highscore
 * list (SESSION HIGHSCORE DISPLAY GAMEOVER, UC-004/UC-006) and the restart
 * button (GAME OVER RESTART BUTTON). The button exists only in the markup
 * show() writes, so it is gone whenever the screen is hidden (GAME OVER
 * RESTART BUTTON HIDDEN).
 */
export class GameOverScreen {
  constructor(element) {
    this.element = element;
    this.html = '';
  }

  /**
   * @param {number} finalScore
   * @param {Array<{score:number,initials:string,timestamp:number}>} highscores
   */
  show(finalScore, highscores) {
    const list = highscores
      .map((e, i) => `<div>${i + 1}. ${e.initials} — ${e.score}</div>`)
      .join('');
    const html = `<div class="game-over">Game Over</div><div>Final score: ${finalScore}</div><div class="highscore-list">${list}</div><button type="button" class="restart-button">Restart</button>`;
    // Rewrite only on change: replacing the button every frame would swallow clicks.
    if (html !== this.html) {
      this.element.innerHTML = html;
      this.html = html;
    }
    this.element.classList.add('show');
  }

  hide() {
    this.element.innerHTML = '';
    this.html = '';
    this.element.classList.remove('show');
  }

  /**
   * Registers the action of the restart button; the listener sits on the
   * overlay, so it survives the markup being rewritten.
   * @param {() => void} callback
   */
  onRestart(callback) {
    this.element.addEventListener('click', (event) => {
      const target = event.target;
      if (target && typeof target.closest === 'function' && target.closest('.restart-button')) {
        callback();
      }
    });
  }
}
