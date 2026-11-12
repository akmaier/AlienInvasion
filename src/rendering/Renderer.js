/**
 * Renderer - facade: draws the current GameState to the canvas and manages
 * the DOM overlays (score, game-over screen, highscore overlay, initials
 * prompt, ship selection screen). Reads GameState only; mutates no
 * simulation state (MOD-rendering).
 */
import { CanvasRenderer } from './CanvasRenderer.js';
import { ScoreDisplay } from './ScoreDisplay.js';
import { GameOverScreen } from './GameOverScreen.js';
import { HighscoreOverlay } from './HighscoreOverlay.js';
import { InitialsPrompt } from './InitialsPrompt.js';
import { ShipSelectionScreen } from './ShipSelectionScreen.js';

export class Renderer {
  constructor(ctx, dom) {
    this.canvasRenderer = new CanvasRenderer(ctx);
    this.scoreDisplay = new ScoreDisplay(dom.score);
    this.gameOverScreen = new GameOverScreen(dom.gameOver);
    this.highscoreOverlay = new HighscoreOverlay(dom.highscoreOverlay);
    this.initialsPrompt = new InitialsPrompt(dom.initialsPrompt);
    this.shipSelectionScreen = new ShipSelectionScreen(dom.shipSelection);
  }

  /** Draws one frame from the given GameState snapshot. */
  render(state) {
    this.canvasRenderer.clear();
    this.canvasRenderer.drawBackground();
    this.canvasRenderer.drawAliens(state.aliens);
    this.canvasRenderer.drawShip(state.ship.x, state.ship.width, state.ship.shipType);
    this.canvasRenderer.drawProjectiles(state.projectiles);
    this.scoreDisplay.update(state.score);

    this.hideAllOverlays();
    if (state.phase === 'ShipSelection') {
      this.shipSelectionScreen.render(state.shipSelectionOptions, state.selectedShipOption);
      this.shipSelectionScreen.show();
    } else {
      this.shipSelectionScreen.hide();
      if (state.phase === 'GameOver') {
        this.gameOverScreen.show(state.score, state.highscores);
      } else if (state.showHighscoreOverlay) {
        this.highscoreOverlay.show(state.highscores);
      } else {
        this.highscoreOverlay.hide();
      }
    }
  }

  /** @param {(initials: string) => void} callback */
  showInitialsPrompt(callback) {
    this.initialsPrompt.show(callback);
  }

  /** Reads the current initials from the prompt's input and submits them via the callback registered at show() time. */
  submitInitials() {
    this.initialsPrompt.submit();
  }

  hideInitialsPrompt() {
    this.initialsPrompt.hide();
  }

  hideAllOverlays() {
    this.shipSelectionScreen.hide();
    this.gameOverScreen.hide();
    this.highscoreOverlay.hide();
  }
}
