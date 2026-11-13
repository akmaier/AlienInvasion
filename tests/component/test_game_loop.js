// Component tests for the entry point and main loop (game.js, index.html), ITM-004.
// Module under test: the requestAnimationFrame loop wiring MOD-input, MOD-game-logic,
// MOD-rendering (ARC-001, ARC-004).
// Test level: subsystem
// Requirements exercised: IMPLEMENTATION JAVASCRIPT WEB; end-to-end behaviour of UC-001..UC-008.
// Runs in plain Node: game.js skips the browser start-up when window/document are absent,
// so the exported factories can be driven frame by frame with fakes.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSession, createRenderer } from '../../game.js';
import { createGameCommands, KeyboardHandler } from '../../src/input/index.js';

const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;

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
      toggle(c) { if (this._classes.has(c)) { this._classes.delete(c); return false; } this._classes.add(c); return true; },
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

function frame(session, renderer, commands) {
  const state = session.update(commands);
  renderer.render(state);
  return state;
}

describe('game.js (MOD-entry; IMPLEMENTATION JAVASCRIPT WEB)', () => {
  it('loads game.js from index.html with no server', () => {
    const html = readFileSync('index.html', 'utf8');
    assert.ok(html.includes('<script type="module" src="game.js"></script>'));
    assert.ok(html.includes('<canvas'));
    assert.ok(html.includes('id="score"'));
  });

  it('imports in Node without a browser (start-up is skipped)', () => {
    assert.strictEqual(typeof createSession, 'function');
    assert.strictEqual(typeof createRenderer, 'function');
  });
});

describe('Main loop order: input -> update -> render (ARC-001)', () => {
  it('runs input, then update, then render each frame and the game state advances', () => {
    const session = newSession();
    const renderer = createRenderer(mockContext(), newDom());
    const order = [];
    const realUpdate = session.update.bind(session);
    session.update = (commands) => {
      order.push('update');
      return realUpdate(commands);
    };
    const realRender = renderer.render.bind(renderer);
    renderer.render = (state) => {
      order.push('render');
      realRender(state);
    };

    // 1. input: select the ship (confirm selects the highlighted option)
    const state1 = frame(session, renderer, createGameCommands({ confirm: true }));
    assert.strictEqual(order.join(','), 'update,render');
    assert.strictEqual(state1.phase, 'Playing');
    assert.strictEqual(state1.ship.shipType, 'regular');

    // 2 -> n. update moves the alien formation horizontally each frame
    const startX = state1.aliens[0].x;
    const state2 = frame(session, renderer, createGameCommands());
    assert.deepStrictEqual(order.join(','), 'update,render,update,render');
    assert.ok(state2.aliens[0].x > startX, 'aliens moved horizontally');
    assert.ok(order.join(',').endsWith('update,render'), 'each frame ends with render');
  });
});

describe('Ship movement (UC-001, UC-008)', () => {
  it('moves the regular ship left and right at type-specific speed and clamps at the edges', () => {
    const session = newSession();
    const renderer = createRenderer(mockContext(), newDom());
    frame(session, renderer, createGameCommands({ confirm: true })); // regular ship
    const startX = session.ship.x;
    for (let i = 0; i < 5; i++) frame(session, renderer, createGameCommands({ left: true }));
    assert.strictEqual(session.ship.x, startX - 5 * 6);
    let steps = 0;
    while (session.ship.x < SCREEN_WIDTH - session.ship.width && steps++ < 1000) {
      frame(session, renderer, createGameCommands({ right: true }));
    }
    assert.strictEqual(session.ship.x, SCREEN_WIDTH - session.ship.width); // clamped at right edge
    frame(session, renderer, createGameCommands({ left: true }));
    assert.ok(session.ship.x <= SCREEN_WIDTH - session.ship.width); // never beyond the right edge
  });

  it('moves the slow ship slower than the regular ship', () => {
    const session = newSession();
    const renderer = createRenderer(mockContext(), newDom());
    frame(session, renderer, createGameCommands({ right: true })); // highlight slow ship
    frame(session, renderer, createGameCommands({ confirm: true })); // select slow ship
    assert.strictEqual(session.ship.shipType, 'slow');
    assert.strictEqual(session.ship.movementSpeed, 3);
    const startX = session.ship.x;
    frame(session, renderer, createGameCommands({ left: true }));
    assert.strictEqual(session.ship.x, startX - 3);
  });

  it('cancels movement when left and right are held together', () => {
    const session = newSession();
    const renderer = createRenderer(mockContext(), newDom());
    frame(session, renderer, createGameCommands({ confirm: true }));
    const startX = session.ship.x;
    frame(session, renderer, createGameCommands({ left: true, right: true }));
    assert.strictEqual(session.ship.x, startX);
  });
});

describe('Firing (UC-001, UC-003)', () => {
  it('fires exactly one projectile per Space press', () => {
    const session = newSession();
    const renderer = createRenderer(mockContext(), newDom());
    frame(session, renderer, createGameCommands({ confirm: true }));
    frame(session, renderer, createGameCommands({ fire: true }));
    assert.strictEqual(session.getState().projectiles.length, 1);
    frame(session, renderer, createGameCommands({ fire: true })); // held: no repeat
    assert.strictEqual(session.getState().projectiles.length, 1);
    frame(session, renderer, createGameCommands()); // release
    frame(session, renderer, createGameCommands({ fire: true })); // press again
    assert.strictEqual(session.getState().projectiles.length, 2);
  });

  it('moves projectiles upward at constant speed and removes them at the top', () => {
    const session = newSession();
    const renderer = createRenderer(mockContext(), newDom());
    frame(session, renderer, createGameCommands({ confirm: true }));
    frame(session, renderer, createGameCommands({ fire: true }));
    const startY = session.getState().projectiles[0].y;
    frame(session, renderer, createGameCommands());
    assert.strictEqual(session.getState().projectiles[0].y, startY - 7);
    for (let i = 0; i < 100; i++) frame(session, renderer, createGameCommands());
    assert.strictEqual(session.getState().projectiles.length, 0);
  });
});

describe('Game over (UC-004)', () => {
  it('ends the game when an alien reaches the bottom and stops spawning', () => {
    const session = newSession();
    const renderer = createRenderer(mockContext(), newDom());
    frame(session, renderer, createGameCommands({ confirm: true }));
    session.formation.speed = 0;
    session.formation.aliens[0].y = session.ship.y - session.formation.aliens[0].height;
    const state = frame(session, renderer, createGameCommands());
    assert.strictEqual(state.phase, 'GameOver');
    const aliensLeft = session.formation.aliens.length;
    const projectilesLeft = session.getState().projectiles.length;
    frame(session, renderer, createGameCommands({ fire: true })); // spawning stopped
    assert.strictEqual(session.phase, 'GameOver');
    assert.strictEqual(session.formation.aliens.length, aliensLeft);
    assert.strictEqual(session.getState().projectiles.length, projectilesLeft);
  });

  it('ends the game when an alien collides with the ship', () => {
    const session = newSession();
    const renderer = createRenderer(mockContext(), newDom());
    frame(session, renderer, createGameCommands({ confirm: true }));
    session.formation.speed = 0;
    const alien = session.formation.aliens[0];
    alien.x = session.ship.x;
    alien.y = session.ship.y;
    const state = frame(session, renderer, createGameCommands());
    assert.strictEqual(state.phase, 'GameOver');
  });

  it('restarts into a new session at ShipSelection, clearing the score and keeping the highscores (SESSION HIGHSCORE KEPT ON NEW SESSION)', () => {
    const session = newSession();
    const renderer = createRenderer(mockContext(), newDom());
    frame(session, renderer, createGameCommands({ confirm: true }));
    session.formation.speed = 0;
    session.formation.aliens[0].y = session.ship.y;
    frame(session, renderer, createGameCommands());
    assert.strictEqual(session.phase, 'GameOver');
    assert.strictEqual(session.awaitingInitials, true);
    session.submitInitials('XY');
    assert.strictEqual(session.highscores.getEntries().length, 1);
    frame(session, renderer, createGameCommands({ confirm: true })); // restart
    assert.strictEqual(session.phase, 'ShipSelection');
    assert.strictEqual(session.score.get(), 0);
    assert.strictEqual(session.highscores.getEntries().length, 1, 'a new session keeps the highscore list');
  });
});

describe('Input device wiring (UC-001, UC-006)', () => {
  it('derives commands from a KeyboardHandler and the loop reacts', () => {
    const session = newSession();
    const renderer = createRenderer(mockContext(), newDom());
    const handler = new KeyboardHandler();
    handler.onKeyDown({ code: 'ArrowRight', preventDefault() {} });
    const commands = handler.getCommands();
    assert.strictEqual(commands.right, true);
    const state = frame(session, renderer, commands);
    assert.strictEqual(state.phase, 'ShipSelection'); // navigation only, no confirm yet
    assert.strictEqual(session.selectedShipOption, 1); // highlight moved to the slow ship
  });

  it('toggles the highscore overlay through the loop', () => {
    const session = newSession();
    const dom = newDom();
    const renderer = createRenderer(mockContext(), dom);
    frame(session, renderer, createGameCommands({ confirm: true }));
    session.toggleHighscoreOverlay();
    const state = frame(session, renderer, createGameCommands());
    renderer.render(state);
    assert.ok(dom.highscoreOverlay.classList.contains('show'), 'highscore overlay must be shown');
    session.toggleHighscoreOverlay();
    const state2 = frame(session, renderer, createGameCommands());
    renderer.render(state2);
    assert.ok(!dom.highscoreOverlay.classList.contains('show'), 'highscore overlay must be hidden');
  });
});
