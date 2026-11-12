/**
 * GameSession - orchestrates one frame of the simulation.
 *
 * Receives GameCommands from the input layer, advances the simulation
 * (movement, collisions, spawning/removal, scoring), applies the game-over
 * conditions and produces a GameState snapshot for the rendering layer. The
 * module knows nothing about input devices or rendering.
 *
 * Phases: ShipSelection -> Playing -> GameOver -> ShipSelection (new session).
 */
import { createGameCommands } from '../../src/input/index.js';
import { createGameState } from './GameState.js';
import { Ship } from './Ship.js';
import { AlienFormation } from './AlienFormation.js';
import { ProjectileManager } from './ProjectileManager.js';
import { CollisionSystem } from './CollisionSystem.js';
import { ScoreCounter } from './ScoreCounter.js';
import { HighscoreStore } from './HighscoreStore.js';

const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const SHIP_WIDTH = 40;
const SHIP_HEIGHT = 30;
const FORMATION_COLS = 6;
const FORMATION_ROWS = 4;
const FORMATION_SPEED = 2;
const FORMATION_DESCENT_STEP = 25;
const PROJECTILE_WIDTH = 4;
const PROJECTILE_HEIGHT = 10;

const SHIP_SELECTION_OPTIONS = Object.freeze([
  Object.freeze({
    type: 'regular',
    label: 'Regular ship',
    description: 'Standard speed, standard projectile.',
  }),
  Object.freeze({
    type: 'slow',
    label: 'Slow ship',
    description: 'Slower horizontal movement; special projectile destroys up to three aliens per shot.',
  }),
]);

export class GameSession {
  /**
   * @param {object} [props]
   * @param {number} [props.screenWidth]
   * @param {number} [props.screenHeight]
   */
  constructor({ screenWidth = SCREEN_WIDTH, screenHeight = SCREEN_HEIGHT } = {}) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.ship = new Ship({
      x: screenWidth / 2 - SHIP_WIDTH / 2,
      y: screenHeight - SHIP_HEIGHT - 10,
      width: SHIP_WIDTH,
      height: SHIP_HEIGHT,
      shipType: 'regular',
    });
    this.formation = this.createFormation();
    this.projectiles = new ProjectileManager({
      speed: 7,
      width: PROJECTILE_WIDTH,
      height: PROJECTILE_HEIGHT,
    });
    this.score = new ScoreCounter();
    this.highscores = new HighscoreStore();
    this.phase = 'ShipSelection';
    this.selectedShipType = 'regular';
    this.selectedShipOption = 0;
    this.shipSelectionOptions = SHIP_SELECTION_OPTIONS;
    this.showHighscoreOverlay = false;
    this.awaitingInitials = false;
    this.finalScore = 0;
    this.#prevCommands = createGameCommands();
  }

  #prevCommands;

  createFormation() {
    return new AlienFormation({
      screenWidth: this.screenWidth,
      cols: FORMATION_COLS,
      rows: FORMATION_ROWS,
      alienWidth: 40,
      alienHeight: 30,
      startX: 60,
      startY: 50,
      spacingX: 70,
      spacingY: 55,
      speed: FORMATION_SPEED,
      descentStep: FORMATION_DESCENT_STEP,
    });
  }

  /**
   * Advances the simulation one frame from the given player commands and
   * returns the new GameState snapshot.
   * @param {object} commands - {left,right,fire,confirm,highscoreToggle}
   * @returns {import('./GameState.js').GameState}
   */
  update(commands) {
    if (this.phase === 'ShipSelection') {
      this.updateShipSelection(commands);
    } else if (this.phase === 'Playing') {
      this.updatePlaying(commands);
    } else if (this.phase === 'GameOver') {
      // GameOver -> ShipSelection on restart (ARC-004): clears entities, score,
      // and the session highscore list. While initials are awaited, the confirm
      // key submits them instead (handled by the entry point), so it must not
      // restart the session here.
      if (commands.confirm && !this.#prevCommands.confirm && !this.awaitingInitials) {
        this.startNewGame();
      }
    }
    this.#prevCommands = createGameCommands(commands);
    return this.getState();
  }

  updateShipSelection(commands) {
    if (commands.left && !this.#prevCommands.left) {
      this.navigateShipSelection(-1);
    }
    if (commands.right && !this.#prevCommands.right) {
      this.navigateShipSelection(1);
    }
    if (commands.confirm && !this.#prevCommands.confirm) {
      this.confirmShipSelection();
    }
  }

  updatePlaying(commands) {
    this.ship.move(commands.left, commands.right, this.screenWidth);

    if (commands.fire && !this.#prevCommands.fire) {
      this.projectiles.spawn(
        this.ship.x + this.ship.width / 2 - PROJECTILE_WIDTH / 2,
        this.ship.y - PROJECTILE_HEIGHT,
        this.selectedShipType
      );
    }

    this.formation.step();
    this.projectiles.step();
    this.resolveCollisions();
    this.checkGameOver();

    if (commands.highscoreToggle && !this.#prevCommands.highscoreToggle) {
      this.showHighscoreOverlay = !this.showHighscoreOverlay;
    }
  }

  resolveCollisions() {
    const projectiles = this.projectiles.projectiles;
    const aliens = this.formation.aliens;
    const collisions = CollisionSystem.checkProjectileAlien(projectiles, aliens);

    // Group hits per projectile (projectile index -> alien indices).
    const hitsPerProjectile = new Map();
    for (const { projectileIndex, alienIndex } of collisions) {
      const hits = hitsPerProjectile.get(projectileIndex) || [];
      hits.push(alienIndex);
      hitsPerProjectile.set(projectileIndex, hits);
    }

    const aliensToDestroy = new Set();
    const projectilesToRemove = new Set();
    for (const [projectileIndex, alienIndices] of hitsPerProjectile) {
      const projectile = projectiles[projectileIndex];
      for (const alienIndex of alienIndices) {
        aliensToDestroy.add(alienIndex);
      }
      if (projectile.type === 'regular') {
        projectilesToRemove.add(projectileIndex);
      } else {
        // Special projectile (slow ship): destroys up to three aliens in one
        // shot, then is removed (ARC-006).
        const capacity = 3 - projectile.aliensDestroyed;
        const hits = alienIndices.slice(0, capacity);
        projectile.aliensDestroyed += hits.length;
        if (projectile.aliensDestroyed >= 3) {
          projectilesToRemove.add(projectileIndex);
        }
      }
    }

    // One point per destroyed alien (SCORE INCREMENT).
    for (let i = 0; i < aliensToDestroy.size; i++) {
      this.score.increment();
    }

    // Remove destroyed aliens, highest index first.
    for (const alienIndex of [...aliensToDestroy].sort((a, b) => b - a)) {
      aliens.splice(alienIndex, 1);
    }

    // Remove spent projectiles, highest index first.
    for (const projectileIndex of [...projectilesToRemove].sort((a, b) => b - a)) {
      projectiles.splice(projectileIndex, 1);
    }
  }

  checkGameOver() {
    const aliens = this.formation.aliens;
    if (aliens.length === 0) return;
    if (
      CollisionSystem.checkAlienGround(aliens, this.ship.y) ||
      CollisionSystem.checkAlienShip(aliens, this.ship)
    ) {
      this.gameOver();
    }
  }

  gameOver() {
    this.phase = 'GameOver';
    this.awaitingInitials = true;
    this.finalScore = this.score.get();
  }

  /** Starts a new session: back to ShipSelection, score and highscores cleared. */
  startNewGame() {
    this.ship = new Ship({
      x: this.screenWidth / 2 - SHIP_WIDTH / 2,
      y: this.screenHeight - SHIP_HEIGHT - 10,
      width: SHIP_WIDTH,
      height: SHIP_HEIGHT,
      shipType: this.selectedShipType,
    });
    this.formation = this.createFormation();
    this.projectiles = new ProjectileManager({
      speed: 7,
      width: PROJECTILE_WIDTH,
      height: PROJECTILE_HEIGHT,
    });
    this.score.reset();
    this.highscores.clear();
    this.phase = 'ShipSelection';
    this.selectedShipOption = 0;
    this.showHighscoreOverlay = false;
    this.awaitingInitials = false;
    this.finalScore = 0;
  }

  navigateShipSelection(direction) {
    this.selectedShipOption = Math.min(
      Math.max(this.selectedShipOption + direction, 0),
      this.shipSelectionOptions.length - 1
    );
  }

  confirmShipSelection() {
    if (this.phase === 'GameOver') {
      this.startNewGame();
      return;
    }
    if (this.phase !== 'ShipSelection') return;
    this.initializeGame(this.shipSelectionOptions[this.selectedShipOption].type);
  }

  initializeGame(shipType) {
    this.selectedShipType = shipType;
    this.ship = new Ship({
      x: this.screenWidth / 2 - SHIP_WIDTH / 2,
      y: this.screenHeight - SHIP_HEIGHT - 10,
      width: SHIP_WIDTH,
      height: SHIP_HEIGHT,
      shipType,
    });
    this.formation = this.createFormation();
    this.projectiles = new ProjectileManager({
      speed: 7,
      width: PROJECTILE_WIDTH,
      height: PROJECTILE_HEIGHT,
    });
    this.score.reset();
    this.phase = 'Playing';
    this.awaitingInitials = false;
  }

  toggleHighscoreOverlay() {
    this.showHighscoreOverlay = !this.showHighscoreOverlay;
  }

  submitInitials(initials) {
    this.highscores.addEntry(this.finalScore, initials);
    this.awaitingInitials = false;
  }

  /** @returns {import('./GameState.js').GameState} */
  getState() {
    return createGameState({
      phase: this.phase,
      ship: this.ship,
      aliens: this.formation ? this.formation.getPositions() : [],
      projectiles: this.projectiles.getPositions(),
      score: this.score.get(),
      highscores: this.highscores.getEntries(),
      showHighscoreOverlay: this.showHighscoreOverlay,
      awaitingInitials: this.awaitingInitials,
      shipSelectionOptions: this.shipSelectionOptions,
      selectedShipOption: this.selectedShipOption,
    });
  }
}
