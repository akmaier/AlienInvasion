/**
 * HighscoreOverlay - the in-game highscore list opened with the 'H' key
 * (SESSION HIGHSCORE DISPLAY INGAME, UC-006).
 */
export class HighscoreOverlay {
  constructor(element) {
    this.element = element;
  }

  /**
   * @param {Array<{score:number,initials:string,timestamp:number}>} highscores
   */
  show(highscores) {
    const list = highscores
      .map((e) => `<div>${e.initials} — ${e.score}</div>`)
      .join('');
    this.element.innerHTML = `<div class="highscore-overlay">${list}</div>`;
    this.element.classList.add('show');
  }

  hide() {
    this.element.innerHTML = '';
    this.element.classList.remove('show');
  }
}
