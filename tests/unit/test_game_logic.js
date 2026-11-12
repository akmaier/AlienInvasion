// Unit tests for the game logic module (src/game-logic), ITM-002.
// Module under test: MOD-game-logic.
// Requirements exercised:
//   GAMEPLAY HORIZONTAL MOVEMENT, GAMEPLAY DESCENDING MOVEMENT,
//   PROJECTILE TRAVEL, PROJECTILE REMOVAL, ALIEN DESTRUCTION, SCORE INCREMENT,
//   GAME OVER CONDITION,
//   PLAYER SHIP TYPE REGULAR, PLAYER SHIP TYPE SLOW,
//   PLAYER SHIP SLOW MOVEMENT, PLAYER SHIP SLOW SPECIAL SHOT,
//   SESSION HIGHSCORE DATA, SESSION HIGHSCORE LIMIT, SESSION HIGHSCORE RESET.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GameSession,
  Ship,
  AlienFormation,
  ProjectileManager,
  CollisionSystem,
  ScoreCounter,
  HighscoreStore,
} from '../../src/game-logic/index.js';

const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;

function makeFormation({ cols = 6, rows = 4, speed = 2 } = {}) {
  return new AlienFormation({
    screenWidth: SCREEN_WIDTH,
    cols,
    rows,
    alienWidth: 40,
    alienHeight: 30,
    startX: 60,
    startY: 50,
    spacingX: 70,
    spacingY: 55,
    speed,
    descentStep: 25,
  });
}

function positionsOf(formation) {
  return formation.aliens.map((a) => ({ x: a.x, y: a.y, w: a.width, h: a.height }));
}

describe('Ship (MOD-game-logic; PLAYER SHIP TYPE REGULAR / PLAYER SHIP TYPE SLOW / PLAYER SHIP SLOW MOVEMENT)', () => {
  it('regular ship moves at standard speed, slow ship at a slower speed', () => {
    const regular = new Ship({ x: 100, width: 40, shipType: 'regular' });
    const slow = new Ship({ x: 100, width: 40, shipType: 'slow' });
    assert.strictEqual(regular.movementSpeed, 6);
    assert.strictEqual(slow.movementSpeed, 3);
    assert.strictEqual(slow.movementSpeed < regular.movementSpeed, true);
  });

  it('moves left while left is held and clamps at the left screen edge', () => {
    const ship = new Ship({ x: 300, width: 40, shipType: 'regular' });
    ship.move(true, false, SCREEN_WIDTH);
    assert.strictEqual(ship.x, 294);
    for (let i = 0; i < 50; i++) ship.move(true, false, SCREEN_WIDTH);
    assert.strictEqual(ship.x, 0);
  });

  it('moves right while right is held and clamps at the right screen edge', () => {
    const ship = new Ship({ x: 300, width: 40, shipType: 'regular' });
    ship.move(false, true, SCREEN_WIDTH);
    assert.strictEqual(ship.x, 306);
    ship.x = SCREEN_WIDTH - ship.width;
    ship.move(false, true, SCREEN_WIDTH);
    assert.strictEqual(ship.x, SCREEN_WIDTH - ship.width);
  });

  it('does not move when left and right are held simultaneously (inputs cancel)', () => {
    const ship = new Ship({ x: 300, width: 40, shipType: 'slow' });
    ship.move(true, true, SCREEN_WIDTH);
    assert.strictEqual(ship.x, 300);
    ship.move(false, false, SCREEN_WIDTH);
    assert.strictEqual(ship.x, 300);
  });

  it('reports position, type and speed via getters', () => {
    const ship = new Ship({ x: 10, width: 40, shipType: 'slow' });
    const pos = ship.getPosition();
    assert.deepStrictEqual(pos, { x: 10, width: 40, height: 30 });
    assert.strictEqual(ship.getShipType(), 'slow');
    assert.strictEqual(ship.getMovementSpeed(), 3);
  });
});

describe('AlienFormation (MOD-game-logic; GAMEPLAY HORIZONTAL MOVEMENT / GAMEPLAY DESCENDING MOVEMENT)', () => {
  it('moves all aliens horizontally as a single unit at constant speed', () => {
    const formation = makeFormation({ speed: 3 });
    const before = positionsOf(formation);
    formation.step();
    const after = positionsOf(formation);
    assert.strictEqual(formation.direction, 1);
    for (let i = 0; i < before.length; i++) {
      assert.strictEqual(after[i].x, before[i].x + 3);
      assert.strictEqual(after[i].y, before[i].y);
    }
  });

  it('reverses direction and descends when the rightmost alien hits the right edge', () => {
    const formation = makeFormation({ speed: 5 });
    formation.direction = 1;
    // Place every alien so that one more step would push the rightmost past the edge.
    for (const a of formation.aliens) {
      a.x = SCREEN_WIDTH - a.width - 1;
    }
    const beforeY = formation.aliens.map((a) => a.y);
    formation.step();
    assert.strictEqual(formation.direction, -1);
    for (let i = 0; i < formation.aliens.length; i++) {
      const a = formation.aliens[i];
      assert.strictEqual(a.x, SCREEN_WIDTH - a.width - 1); // no horizontal move this frame
      assert.strictEqual(a.y, beforeY[i] + 25); // every row descends from its own line
    }
  });

  it('reverses direction and descends when the leftmost alien hits the left edge', () => {
    const formation = makeFormation({ speed: 5 });
    formation.direction = -1;
    for (const a of formation.aliens) {
      a.x = 0;
    }
    const beforeY = formation.aliens.map((a) => a.y);
    formation.step();
    assert.strictEqual(formation.direction, 1);
    for (let i = 0; i < formation.aliens.length; i++) {
      const a = formation.aliens[i];
      assert.strictEqual(a.x, 0);
      assert.strictEqual(a.y, beforeY[i] + 25);
    }
  });

  it('moves in the opposite direction after a reversal', () => {
    const formation = makeFormation({ speed: 4 });
    formation.direction = -1;
    for (const a of formation.aliens) a.x = 2; // left of one step: hits the left edge
    formation.step(); // reverse + descend
    assert.strictEqual(formation.direction, 1);
    for (const a of formation.aliens) {
      assert.strictEqual(a.x, 2);
    }
    formation.step(); // now moves right again
    for (const a of formation.aliens) {
      assert.strictEqual(a.x, 6);
    }
  });

  it('keeps every alien within the horizontal screen bounds', () => {
    const formation = makeFormation({ speed: 100 });
    formation.direction = 1;
    for (let i = 0; i < 20; i++) formation.step();
    for (const a of formation.aliens) {
      assert.ok(a.x >= 0);
      assert.ok(a.x + a.width <= SCREEN_WIDTH);
    }
  });

  it('exposes alien positions as x, y, width, height', () => {
    const formation = makeFormation();
    const positions = formation.getPositions();
    assert.strictEqual(positions.length, 6 * 4);
    for (const p of positions) {
      assert.ok(typeof p.x === 'number' && typeof p.y === 'number');
      assert.strictEqual(p.width, 40);
      assert.strictEqual(p.height, 30);
    }
  });
});

describe('ProjectileManager (MOD-game-logic; PROJECTILE TRAVEL / PROJECTILE REMOVAL)', () => {
  it('spawns a regular projectile for the regular ship and a special one for the slow ship', () => {
    const pm = new ProjectileManager({ speed: 7, width: 4, height: 10 });
    pm.spawn(100, 500, 'regular');
    pm.spawn(200, 500, 'slow');
    assert.strictEqual(pm.projectiles.length, 2);
    assert.strictEqual(pm.projectiles[0].type, 'regular');
    assert.strictEqual(pm.projectiles[0].aliensDestroyed, 0);
    assert.strictEqual(pm.projectiles[1].type, 'special');
    assert.strictEqual(pm.projectiles[1].x, 200);
    assert.strictEqual(pm.projectiles[1].y, 500);
  });

  it('moves every projectile upward at constant speed each frame', () => {
    const pm = new ProjectileManager({ speed: 7, width: 4, height: 10 });
    pm.spawn(100, 100, 'regular');
    pm.spawn(200, 200, 'special');
    pm.step();
    assert.strictEqual(pm.projectiles[0].y, 93);
    assert.strictEqual(pm.projectiles[1].y, 193);
    pm.step();
    assert.strictEqual(pm.projectiles[0].y, 86);
    assert.strictEqual(pm.projectiles[1].y, 186);
  });

  it('removes projectiles that exit the top of the viewport', () => {
    const pm = new ProjectileManager({ speed: 7, width: 4, height: 10 });
    pm.spawn(100, 5, 'regular');
    pm.step();
    assert.strictEqual(pm.projectiles.length, 0);
  });

  it('keeps projectiles that are still on screen', () => {
    const pm = new ProjectileManager({ speed: 7, width: 4, height: 10 });
    pm.spawn(100, 20, 'regular');
    pm.step();
    assert.strictEqual(pm.projectiles.length, 1);
  });
});

describe('CollisionSystem (MOD-game-logic; ALIEN DESTRUCTION / SCORE INCREMENT / PLAYER SHIP SLOW SPECIAL SHOT)', () => {
  it('detects bounding-box overlap between a projectile and an alien', () => {
    const projectiles = [{ x: 110, y: 100, width: 4, height: 10, type: 'regular', aliensDestroyed: 0 }];
    const aliens = [{ x: 100, y: 100, width: 40, height: 30 }];
    const collisions = CollisionSystem.checkProjectileAlien(projectiles, aliens);
    assert.deepStrictEqual(collisions, [{ projectileIndex: 0, alienIndex: 0 }]);
  });

  it('reports no collision when the projectile misses the alien', () => {
    const projectiles = [{ x: 300, y: 100, width: 4, height: 10, type: 'regular', aliensDestroyed: 0 }];
    const aliens = [{ x: 100, y: 100, width: 40, height: 30 }];
    assert.deepStrictEqual(CollisionSystem.checkProjectileAlien(projectiles, aliens), []);
  });

  it('detects collision between an alien and the player ship', () => {
    const aliens = [{ x: 300, y: 540, width: 40, height: 30 }];
    const ship = { x: 310, y: 550, width: 40, height: 30 };
    assert.strictEqual(CollisionSystem.checkAlienShip(aliens, ship), true);
    assert.strictEqual(CollisionSystem.checkAlienShip([{ x: 100, y: 100, width: 40, height: 30 }], ship), false);
  });

  it('detects an alien reaching the ground (the ship\'s line)', () => {
    const aliens = [{ x: 100, y: 530, width: 40, height: 30 }];
    const shipY = 550;
    assert.strictEqual(CollisionSystem.checkAlienGround(aliens, shipY), true);
    assert.strictEqual(CollisionSystem.checkAlienGround([{ x: 100, y: 500, width: 40, height: 30 }], shipY), false);
  });
});

describe('ScoreCounter (MOD-game-logic; SCORE INCREMENT)', () => {
  it('starts at zero and increments by exactly one', () => {
    const score = new ScoreCounter();
    assert.strictEqual(score.get(), 0);
    score.increment();
    assert.strictEqual(score.get(), 1);
    score.increment();
    score.increment();
    assert.strictEqual(score.get(), 3);
  });

  it('resets to zero', () => {
    const score = new ScoreCounter();
    score.increment();
    score.increment();
    score.reset();
    assert.strictEqual(score.get(), 0);
  });
});

describe('HighscoreStore (MOD-game-logic; SESSION HIGHSCORE DATA / SESSION HIGHSCORE LIMIT / SESSION HIGHSCORE RESET)', () => {
  it('stores score, initials and a timestamp per entry', () => {
    const store = new HighscoreStore();
    store.addEntry(42, 'ABC', 1000);
    const entries = store.getEntries();
    assert.strictEqual(entries.length, 1);
    assert.deepStrictEqual(entries[0], { score: 42, initials: 'ABC', timestamp: 1000 });
  });

  it('defaults empty or missing initials to "AAA"', () => {
    const store = new HighscoreStore();
    store.addEntry(10, '');
    store.addEntry(20, undefined);
    assert.deepStrictEqual(store.getEntries()[0].initials, 'AAA');
    assert.deepStrictEqual(store.getEntries()[1].initials, 'AAA');
  });

  it('keeps at most ten entries', () => {
    const store = new HighscoreStore();
    for (let i = 0; i < 15; i++) store.addEntry(i, 'AAA', i);
    const entries = store.getEntries();
    assert.strictEqual(entries.length, 10);
    assert.ok(entries.every((e) => e.score >= 5));
  });

  it('sorts entries by score descending, ties by timestamp ascending', () => {
    const store = new HighscoreStore();
    store.addEntry(100, 'AAA', 2000);
    store.addEntry(300, 'BBB', 1000);
    store.addEntry(100, 'CCC', 500);
    store.addEntry(200, 'DDD', 3000);
    const entries = store.getEntries();
    assert.deepStrictEqual(entries.map((e) => e.initials), ['BBB', 'DDD', 'CCC', 'AAA']);
  });

  it('getEntries returns a copy that callers cannot mutate', () => {
    const store = new HighscoreStore();
    store.addEntry(5, 'AAA', 1);
    const copy = store.getEntries();
    copy.push({ score: 9, initials: 'ZZZ', timestamp: 9 });
    assert.strictEqual(store.getEntries().length, 1);
  });

  it('clear empties the list (reset on new session)', () => {
    const store = new HighscoreStore();
    store.addEntry(5, 'AAA', 1);
    store.clear();
    assert.deepStrictEqual(store.getEntries(), []);
  });
});

describe('GameSession (MOD-game-logic; end-to-end simulation per frame)', () => {
  function newSession() {
    return new GameSession({ screenWidth: SCREEN_WIDTH, screenHeight: SCREEN_HEIGHT });
  }

  it('starts in the ShipSelection phase with both ship types as options', () => {
    const session = newSession();
    assert.strictEqual(session.phase, 'ShipSelection');
    assert.strictEqual(session.selectedShipOption, 0);
    assert.strictEqual(session.shipSelectionOptions.length, 2);
    assert.deepStrictEqual(session.shipSelectionOptions.map((o) => o.type), ['regular', 'slow']);
    assert.strictEqual(session.shipSelectionOptions[0].label, 'Regular ship');
    assert.strictEqual(session.shipSelectionOptions[1].label, 'Slow ship');
    assert.strictEqual(session.shipSelectionOptions[1].description.includes('three'), true);
  });

  it('navigates the ship selection highlight left and right and clamps at the ends', () => {
    const session = newSession();
    session.navigateShipSelection(1);
    assert.strictEqual(session.selectedShipOption, 1);
    session.navigateShipSelection(1);
    assert.strictEqual(session.selectedShipOption, 1);
    session.navigateShipSelection(-1);
    session.navigateShipSelection(-1);
    assert.strictEqual(session.selectedShipOption, 0);
  });

  it('confirming a ship selection starts Playing with the ship at bottom centre', () => {
    const session = newSession();
    session.navigateShipSelection(1); // slow
    session.confirmShipSelection();
    const state = session.getState();
    assert.strictEqual(state.phase, 'Playing');
    assert.strictEqual(state.ship.shipType, 'slow');
    assert.strictEqual(state.ship.movementSpeed, 3);
    assert.strictEqual(state.ship.x, SCREEN_WIDTH / 2 - state.ship.width / 2);
    assert.strictEqual(state.ship.y, SCREEN_HEIGHT - state.ship.height - 10);
    assert.ok(state.aliens.length > 0);
    assert.strictEqual(state.projectiles.length, 0);
    assert.strictEqual(state.score, 0);
  });

  it('moves the ship left and right with type-specific speed while playing', () => {
    const session = newSession();
    session.confirmShipSelection();
    const startX = session.ship.x;
    session.update({ left: false, right: false, fire: false, confirm: false, highscoreToggle: false });
    session.update({ left: true, right: false, fire: false, confirm: false, highscoreToggle: false });
    assert.strictEqual(session.ship.x, startX - 6); // regular speed 6
    session.startNewGame();
    session.navigateShipSelection(1);
    session.confirmShipSelection(); // slow
    const slowStart = session.ship.x;
    session.update({ left: true, right: false, fire: false, confirm: false, highscoreToggle: false });
    assert.strictEqual(session.ship.x, slowStart - 3); // slow speed 3
  });

  it('clamps the ship at the screen edges while playing', () => {
    const session = newSession();
    session.confirmShipSelection();
    session.ship.x = 0;
    session.update({ left: true, right: false, fire: false, confirm: false, highscoreToggle: false });
    assert.strictEqual(session.ship.x, 0);
    session.ship.x = SCREEN_WIDTH - session.ship.width;
    session.update({ left: false, right: true, fire: false, confirm: false, highscoreToggle: false });
    assert.strictEqual(session.ship.x, SCREEN_WIDTH - session.ship.width);
  });

  it('fires one projectile per press from the ship', () => {
    const session = newSession();
    session.confirmShipSelection();
    session.update({ left: false, right: false, fire: true, confirm: false, highscoreToggle: false });
    assert.strictEqual(session.getState().projectiles.length, 1);
    assert.strictEqual(session.getState().projectiles[0].type, 'regular');
    // spawned at ship.y - 10, then moved up one frame (speed 7)
    assert.strictEqual(session.getState().projectiles[0].y, session.ship.y - 17);
    // held fire does not repeat
    session.update({ left: false, right: false, fire: true, confirm: false, highscoreToggle: false });
    assert.strictEqual(session.getState().projectiles.length, 1);
  });

  it('destroys an alien on projectile collision and increments the score by exactly one', () => {
    const session = newSession();
    session.confirmShipSelection();
    session.formation.speed = 0;
    const alien = session.formation.aliens[0];
    session.projectiles.spawn(alien.x + 10, alien.y, 'regular');
    session.update({ left: false, right: false, fire: false, confirm: false, highscoreToggle: false });
    assert.strictEqual(session.formation.aliens.length, 4 * 6 - 1);
    assert.strictEqual(session.score.get(), 1);
    assert.strictEqual(session.getState().projectiles.length, 0);
  });

  it('destroys up to three aliens with a special slow-ship projectile before removing it', () => {
    const session = newSession();
    session.navigateShipSelection(1);
    session.confirmShipSelection();
    session.formation.speed = 0;
    const alien = session.formation.aliens[0];
    const base = { x: alien.x + 10, width: 4, height: 10, speed: 7, type: 'special' };
    // Two aliens at the same spot: both destroyed in one shot, projectile stays.
    session.formation.aliens.push({ x: alien.x, y: alien.y, width: 40, height: 30 });
    session.projectiles.spawn(alien.x + 10, alien.y, 'slow');
    session.update({ left: false, right: false, fire: false, confirm: false, highscoreToggle: false });
    assert.strictEqual(session.score.get(), 2);
    assert.strictEqual(session.getState().projectiles.length, 1);
    assert.strictEqual(session.projectiles.projectiles[0].aliensDestroyed, 2);

    // Third hit removes the projectile: aim at a survivor that is still in the formation.
    const target = session.formation.aliens[0];
    session.projectiles.projectiles.push({ ...base, x: target.x + 10, y: target.y, aliensDestroyed: 2 });
    session.update({ left: false, right: false, fire: false, confirm: false, highscoreToggle: false });
    assert.strictEqual(session.score.get(), 3);
    // The first special projectile (two hits) is still flying; only the spent one is removed.
    assert.strictEqual(session.getState().projectiles.length, 1);
    assert.strictEqual(session.projectiles.projectiles[0].aliensDestroyed, 2);
  });

  it('ends the game when an alien reaches the bottom and stops spawning', () => {
    const session = newSession();
    session.confirmShipSelection();
    session.formation.speed = 0;
    const shipY = session.ship.y;
    session.formation.aliens[0].y = shipY - session.formation.aliens[0].height;
    session.update({ left: false, right: false, fire: false, confirm: false, highscoreToggle: false });
    assert.strictEqual(session.phase, 'GameOver');
    const aliensBefore = session.formation.aliens.length;
    const projectilesBefore = session.projectiles.length;
    session.update({ left: false, right: false, fire: true, confirm: false, highscoreToggle: false });
    assert.strictEqual(session.phase, 'GameOver');
    assert.strictEqual(session.formation.aliens.length, aliensBefore);
    assert.strictEqual(session.projectiles.length, projectilesBefore);
  });

  it('ends the game when an alien collides with the ship', () => {
    const session = newSession();
    session.confirmShipSelection();
    session.formation.speed = 0;
    const alien = session.formation.aliens[0];
    alien.x = session.ship.x;
    alien.y = session.ship.y;
    session.update({ left: false, right: false, fire: false, confirm: false, highscoreToggle: false });
    assert.strictEqual(session.phase, 'GameOver');
  });

  it('restarts from GameOver into ShipSelection, clearing the score but keeping the highscores (SESSION HIGHSCORE RESET: the session is the page session)', () => {
    const session = newSession();
    session.confirmShipSelection();
    session.formation.speed = 0;
    session.formation.aliens[0].y = session.ship.y;
    session.update({ left: false, right: false, fire: false, confirm: false, highscoreToggle: false });
    assert.strictEqual(session.phase, 'GameOver');
    session.highscores.addEntry(100, 'AAA', 1000);
    assert.strictEqual(session.highscores.getEntries().length, 1);
    session.confirmShipSelection(); // restart
    assert.strictEqual(session.phase, 'ShipSelection');
    assert.strictEqual(session.score.get(), 0);
    assert.strictEqual(session.highscores.getEntries().length, 1, 'restart keeps the highscore entry');
    // a fresh session (page reload = new GameSession) starts empty
    assert.strictEqual(newSession().highscores.getEntries().length, 0);
  });

  it('submits initials for the final score on game over', () => {
    const session = newSession();
    session.confirmShipSelection();
    session.formation.speed = 0;
    session.formation.aliens[0].y = session.ship.y;
    session.update({ left: false, right: false, fire: false, confirm: false, highscoreToggle: false });
    assert.strictEqual(session.awaitingInitials, true);
    session.submitInitials('XY');
    assert.strictEqual(session.awaitingInitials, false);
    const entries = session.highscores.getEntries();
    assert.strictEqual(entries.length, 1);
    assert.deepStrictEqual(entries[0], { score: session.score.get(), initials: 'XY', timestamp: entries[0].timestamp });
  });

  it('toggles the highscore overlay', () => {
    const session = newSession();
    session.confirmShipSelection();
    session.toggleHighscoreOverlay();
    assert.strictEqual(session.showHighscoreOverlay, true);
    session.toggleHighscoreOverlay();
    assert.strictEqual(session.showHighscoreOverlay, false);
  });
});
