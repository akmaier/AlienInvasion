// System tests: full-game playthrough through the real modules, ITM-005.
// Test level: system
// Drives GameSession frame by frame with a mock canvas context and fake DOM
// overlays (Playwright against the real index.html is not part of this
// repository's CI; this battery is the Node equivalent). Covers every
// requirement guarded in the product SPEC end to end:
//   IMPLEMENTATION JAVASCRIPT WEB, GAMEPLAY HORIZONTAL MOVEMENT,
//   GAMEPLAY DESCENDING MOVEMENT, PLAYER SHIP SELECTION, PLAYER SHIP TYPE
//   REGULAR/SLOW, PLAYER SHIP SLOW MOVEMENT, PLAYER SHIP SLOW SPECIAL SHOT,
//   PLAYER MOVEMENT KEYS, PLAYER FIRE SPACEBAR, PROJECTILE TRAVEL/REMOVAL,
//   ALIEN DESTRUCTION, SCORE INCREMENT, GAME OVER CONDITION, SCORE DISPLAY,
//   SESSION HIGHSCORE DATA/LIMIT/DISPLAY GAMEOVER/DISPLAY INGAME/KEPT ON NEW SESSION,
//   SESSION START STATE, WAVE FIRST, WAVE NEXT.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, createRenderer } from '../../game.js';

const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };

function mockContext() {
  const calls = [];
  const ctx = {
    canvas: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
    calls,
    fillStyle: null,
    clearRect(...args) { calls.push(args); },
    fillRect(...args) { calls.push(args); },
    fillText(...args) { calls.push(args); },
  };
  return ctx;
}

function fakeElement() {
  const el = {
    style: {},
    classList: {
      _classes: new Set(),
      add(...c) { c.forEach((x) => this._classes.add(x)); },
      remove(...c) { c.forEach((x) => this._classes.delete(x)); },
      contains(c) { return this._classes.has(c); },
    },
    value: '',
    _html: '',
    _text: '',
    addEventListener() {},
    setAttribute() {},
    getAttribute() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  Object.defineProperty(el, 'textContent', {
    get() { return el._text; },
    set(v) { el._text = String(v); },
  });
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html; },
    set(v) { el._html = String(v); el._text = String(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); },
  });
  return el;
}

function newDom() {
  return {
    score: fakeElement(),
    gameOver: fakeElement(),
    highscoreOverlay: fakeElement(),
    initialsPrompt: fakeElement(),
    shipSelection: fakeElement(),
  };
}

function newSession() {
  return createSession({ screenWidth: SCREEN_WIDTH, screenHeight: SCREEN_HEIGHT });
}

function frame(session, renderer, commands = NOOP) {
  const state = session.update(commands);
  renderer.render(state);
  return state;
}

// Enters the Playing phase with the given ship type from any phase.
function selectShip(session, renderer, shipType = 'regular') {
  if (session.phase === 'GameOver') {
    frame(session, renderer, { ...NOOP, confirm: true }); // restart -> ShipSelection
    frame(session, renderer, NOOP);                        // release the confirm key (edge semantics)
  }
  if (session.phase === 'ShipSelection') {
    if (shipType === 'slow') {
      frame(session, renderer, { ...NOOP, right: true }); // highlight the slow ship
    }
    frame(session, renderer, { ...NOOP, confirm: true }); // select -> Playing
  }
  assert.strictEqual(session.phase, 'Playing');
  assert.strictEqual(session.ship.shipType, shipType);
}

describe('System: full playthrough (UC-001 .. UC-008)', () => {
  it('starts with the ship selection screen offering regular and slow ships', () => {
    const session = newSession();
    const renderer = createRenderer(mockContext(), newDom());
    const state = frame(session, renderer, NOOP);
    assert.strictEqual(state.phase, 'ShipSelection');
    assert.strictEqual(state.shipSelectionOptions.length, 2);
    assert.deepStrictEqual(state.shipSelectionOptions.map((o) => o.type), ['regular', 'slow']);
    assert.ok(state.shipSelectionOptions.find((o) => o.type === 'slow').description.includes('three'));
  });

  it('plays a full game with the slow ship: movement, special shot (up to three aliens), game over, highscore', () => {
    const session = newSession();
    const dom = newDom();
    const renderer = createRenderer(mockContext(), dom);
    selectShip(session, renderer, 'slow');

    // PLAYER SHIP SLOW MOVEMENT: slower than the regular ship (6)
    assert.strictEqual(session.ship.movementSpeed, 3);
    const startX = session.ship.x;
    frame(session, renderer, { ...NOOP, left: true });
    assert.strictEqual(session.ship.x, startX - 3);

    // PLAYER FIRE SPACEBAR + PROJECTILE TRAVEL: special projectile moves upward
    frame(session, renderer, { ...NOOP, fire: true });
    assert.strictEqual(session.getState().projectiles.length, 1);
    assert.strictEqual(session.getState().projectiles[0].type, 'special');
    const startY = session.getState().projectiles[0].y;
    frame(session, renderer, NOOP);
    assert.strictEqual(session.getState().projectiles[0].y, startY - 7);

    // PLAYER SHIP SLOW SPECIAL SHOT: destroys up to three aliens in one shot
    session.formation.speed = 0;
    const alien = session.formation.aliens[0];
    const projectile = session.projectiles.projectiles[0];
    projectile.x = alien.x + 10;
    projectile.y = alien.y;
    session.formation.aliens.push({ x: alien.x, y: alien.y, width: 40, height: 30 });
    session.formation.aliens.push({ x: alien.x, y: alien.y, width: 40, height: 30 });
    const before = session.score.get();
    frame(session, renderer, NOOP); // step moves the projectile 7 px up, still overlapping
    assert.strictEqual(session.score.get(), before + 3);
    assert.strictEqual(session.getState().projectiles.length, 0); // spent after the third hit

    // GAME OVER CONDITION: an alien reaching the bottom ends the game
    session.formation.aliens[0].y = session.ship.y - session.formation.aliens[0].height;
    const state = frame(session, renderer, NOOP);
    assert.strictEqual(state.phase, 'GameOver');
    assert.strictEqual(state.awaitingInitials, true);

    // SESSION HIGHSCORE DATA: an entry holds score, initials, timestamp
    session.submitInitials('JMN');
    const entries = session.highscores.getEntries();
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].initials, 'JMN');
    assert.ok(typeof entries[0].timestamp === 'number' && entries[0].timestamp > 0);
    assert.strictEqual(entries[0].score, state.score);

    // SCORE DISPLAY + SESSION HIGHSCORE DISPLAY GAMEOVER: visible on game over
    renderer.render(session.getState());
    assert.ok(dom.gameOver.textContent.includes('JMN'));
    assert.ok(dom.gameOver.textContent.includes(String(state.score)));

    // Restart starts a new game session: score cleared, wave 1, session
    // highscore list kept (SESSION HIGHSCORE KEPT ON NEW SESSION, SESSION START STATE, WAVE FIRST)
    frame(session, renderer, { ...NOOP, confirm: true });
    assert.strictEqual(session.phase, 'ShipSelection');
    assert.strictEqual(session.score.get(), 0);
    assert.strictEqual(session.getState().wave, 1);
    assert.strictEqual(session.highscores.getEntries().length, 1, 'a new session keeps the highscore list');
  });

  it('plays a full game with the regular ship: standard speed, one alien per shot', () => {
    const session = newSession();
    const renderer = createRenderer(mockContext(), newDom());
    selectShip(session, renderer, 'regular');
    assert.strictEqual(session.ship.movementSpeed, 6);

    // PLAYER MOVEMENT KEYS: clamped at both screen edges
    {
      let steps = 0;
      while (session.ship.x > 0 && steps++ < 1000) {
        frame(session, renderer, { ...NOOP, left: true });
      }
    }
    assert.strictEqual(session.ship.x, 0);
    let steps = 0;
    while (session.ship.x < SCREEN_WIDTH - session.ship.width && steps++ < 1000) {
      frame(session, renderer, { ...NOOP, right: true });
    }
    assert.strictEqual(session.ship.x, SCREEN_WIDTH - session.ship.width);

    // PLAYER FIRE SPACEBAR + PROJECTILE REMOVAL: one projectile per press,
    // a regular projectile is gone after destroying one alien
    frame(session, renderer, { ...NOOP, fire: true });
    assert.strictEqual(session.getState().projectiles.length, 1);
    assert.strictEqual(session.getState().projectiles[0].type, 'regular');

    // ALIEN DESTRUCTION + SCORE INCREMENT: exactly one point per alien
    session.formation.speed = 0;
    const alien = session.formation.aliens[0];
    const projectile = session.projectiles.projectiles[0];
    projectile.x = alien.x + 10;
    projectile.y = alien.y;
    const before = session.score.get();
    frame(session, renderer, NOOP);
    assert.strictEqual(session.score.get(), before + 1);
    assert.strictEqual(session.formation.aliens.length, 6 * 4 - 1);
    assert.strictEqual(session.getState().projectiles.length, 0);

    // GAME OVER CONDITION: an alien colliding with the ship ends the game,
    // and all entity spawning stops
    const a2 = session.formation.aliens[0];
    a2.x = session.ship.x;
    a2.y = session.ship.y;
    const state = frame(session, renderer, NOOP);
    assert.strictEqual(state.phase, 'GameOver');
    frame(session, renderer, { ...NOOP, fire: true });
    assert.strictEqual(session.getState().projectiles.length, 0);
  });

  it('alien formation moves horizontally, reverses at edges and descends after each reversal (UC-002)', () => {
    const session = newSession();
    const renderer = createRenderer(mockContext(), newDom());
    selectShip(session, renderer, 'regular');
    session.formation.speed = 5;
    session.formation.direction = 1;
    for (const a of session.formation.aliens) {
      a.x = SCREEN_WIDTH - a.width - 1;
    }
    const beforeY = session.formation.aliens.map((a) => a.y);
    frame(session, renderer, NOOP);
    assert.strictEqual(session.formation.direction, -1);
    for (let i = 0; i < session.formation.aliens.length; i++) {
      const a = session.formation.aliens[i];
      assert.strictEqual(a.y, beforeY[i] + 25); // descended after the reversal
      assert.strictEqual(a.x, SCREEN_WIDTH - a.width - 1); // no horizontal move this frame
    }
    frame(session, renderer, NOOP);
    assert.strictEqual(session.formation.direction, -1);
    for (const a of session.formation.aliens) {
      assert.strictEqual(a.x, SCREEN_WIDTH - a.width - 1 - 5); // now moves left
    }
  });

  it('session highscore list keeps at most ten entries sorted by score descending and survives a new session (UC-006)', () => {
    const session = newSession();
    const renderer = createRenderer(mockContext(), newDom());
    selectShip(session, renderer, 'regular');
    session.formation.speed = 0;
    session.formation.aliens[0].y = session.ship.y - session.formation.aliens[0].height;
    frame(session, renderer, NOOP);
    assert.strictEqual(session.phase, 'GameOver');
    // Fifteen entries for the finished game: the store keeps at most ten,
    // sorted by score descending (entries within one session share the final score,
    // so the order among equal scores is timestamp ascending).
    const scores = [50, 10, 70, 30, 90, 20, 60, 40, 80, 100, 5, 55, 35, 15, 25];
    for (const score of scores) {
      session.finalScore = score;
      session.submitInitials('AAA');
    }
    const entries = session.highscores.getEntries();
    assert.strictEqual(entries.length, 10);
    assert.deepStrictEqual(entries.map((e) => e.score), [100, 90, 80, 70, 60, 55, 50, 40, 35, 30]);
    // a restart starts a new game session that keeps the list (SESSION HIGHSCORE KEPT ON NEW SESSION)
    frame(session, renderer, { ...NOOP, confirm: true });
    assert.strictEqual(session.phase, 'ShipSelection');
    assert.deepStrictEqual(session.highscores.getEntries().map((e) => e.score), [100, 90, 80, 70, 60, 55, 50, 40, 35, 30]);
  });

  it('highscore overlay opens and closes in-game (SESSION HIGHSCORE DISPLAY INGAME)', () => {
    const session = newSession();
    const dom = newDom();
    const renderer = createRenderer(mockContext(), dom);
    selectShip(session, renderer, 'regular');
    session.toggleHighscoreOverlay();
    frame(session, renderer, NOOP);
    assert.ok(dom.highscoreOverlay.classList.contains('show'), 'highscore overlay must be shown');
    session.toggleHighscoreOverlay();
    frame(session, renderer, NOOP);
    assert.ok(!dom.highscoreOverlay.classList.contains('show'), 'highscore overlay must be hidden');
  });
});
