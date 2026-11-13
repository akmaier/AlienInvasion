/**
 * GameSession - orchestrates one frame of the simulation.
 *
 * Receives GameCommands from the input layer, advances the simulation
 * (movement, collisions, spawning/removal, scoring), applies the game-over
 * conditions and produces a GameState snapshot for the rendering layer. The
 * module knows nothing about input devices or rendering.
 *
 * Phases: ShipSelection -> Playing -> GameOver -> ShipSelection (new session).
 * Within Playing the game advances through waves: clearing the formation
 * starts the next wave, whose aliens need one more hit each (ARC-004).
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
    this.score = new ScoreCounter();
    this.highscores = new HighscoreStore();
    this.shipSelectionOptions = SHIP_SELECTION_OPTIONS;
    this.#prevCommands = createGameCommands();
    this.startNewGame();
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
      hitsToDestroy: this.wave,
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
      // GameOver -> ShipSelection on restart (ARC-004): the confirm key, like
      // the restart button, starts a new game session (startNewGame). While
      // initials are awaited, the confirm key submits them instead (handled
      // by the entry point), so it must not restart the session here.
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
    this.startNextWaveIfCleared();
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

    const hitAliens = [];
    const projectilesToRemove = new Set();
    for (const [projectileIndex, alienIndices] of hitsPerProjectile) {
      const projectile = projectiles[projectileIndex];
      if (projectile.type === 'regular') {
        // A regular projectile hits the first alien it intersects and is
        // removed (UC-003 A1).
        hitAliens.push(aliens[alienIndices[0]]);
        projectilesToRemove.add(projectileIndex);
      } else {
        // Special projectile (slow ship): hits up to three aliens, then is
        // removed (ARC-006).
        const hits = alienIndices.slice(0, 3 - projectile.aliensHit);
        for (const alienIndex of hits) hitAliens.push(aliens[alienIndex]);
        projectile.aliensHit += hits.length;
        if (projectile.aliensHit >= 3) {
          projectilesToRemove.add(projectileIndex);
        }
      }
    }

    // Each hit counts toward the alien's n hits in wave n; one point per
    // alien a hit removes (ALIEN DESTRUCTION, SCORE INCREMENT).
    for (const alien of hitAliens) {
      if (this.formation.hit(alien)) this.score.increment();
    }

    // Remove spent projectiles, highest index first.
    for (const projectileIndex of [...projectilesToRemove].sort((a, b) => b - a)) {
      projectiles.splice(projectileIndex, 1);
    }
  }

  /** When the last alien is removed, the next wave starts with a full
   *  formation in its start position, its aliens needing one more hit
   *  (WAVE NEXT); score, ship and phase stay. */
  startNextWaveIfCleared() {
    if (!this.formation.isEmpty()) return;
    this.wave += 1;
    this.formation = this.createFormation();
  }

  checkGameOver() {
    const aliens = this.formation.aliens;
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

  /** Starts a new game session in the state the page loads with: ship
   *  selection, regular ship at its start position, full formation, no
   *  projectiles, score zero (SESSION START STATE) and wave 1 (WAVE FIRST).
   *  The session highscore list is kept (SESSION HIGHSCORE KEPT ON NEW
   *  SESSION). Called on page load and by the restart (GAME OVER RESTART NEW
   *  SESSION). */
  startNewGame() {
    this.wave = 1;
    this.selectedShipType = 'regular';
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
      wave: this.wave,
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
