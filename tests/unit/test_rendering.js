// Unit tests for the rendering module (src/rendering), ITM-003.
// Module under test: MOD-rendering.
// Test level: module
// Requirements exercised:
//   SCORE DISPLAY, SESSION HIGHSCORE DISPLAY GAMEOVER/INGAME,
//   PLAYER SHIP SELECTION, PLAYER SHIP TYPE REGULAR/SLOW,
//   IMPLEMENTATION JAVASCRIPT WEB, ALIEN PIXEL SHAPE (aliens drawn inside their boxes),
//   PLAYER SHIP REGULAR/SLOW PIXEL SHAPE (ships drawn inside their box).
// The module is purely presentational: it reads GameState and mutates no
// simulation state. Tests use a mock 2D canvas context and fake DOM elements.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CanvasRenderer,
  ScoreDisplay,
  GameOverScreen,
  HighscoreOverlay,
  InitialsPrompt,
  ShipSelectionScreen,
  Renderer,
} from '../../src/rendering/index.js';

const WIDTH = 800;
const HEIGHT = 600;

function mockContext() {
  const calls = [];
  const ctx = {
    canvas: { width: WIDTH, height: HEIGHT },
    calls,
    fillStyle: null,
    font: null,
    textAlign: null,
    clearRect(...args) {
      calls.push({ method: 'clearRect', args: [...args] });
    },
    fillRect(...args) {
      calls.push({ method: 'fillRect', args: [...args] });
    },
    fillText(...args) {
      calls.push({ method: 'fillText', args: [...args] });
    },
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

function baseState({ phase = 'Playing', score = 0, showHighscoreOverlay = false, awaitingInitials = false } = {}) {
  return {
    phase,
    ship: { x: 380, y: 560, width: 40, height: 30, shipType: 'regular', movementSpeed: 6 },
    aliens: [
      { x: 60, y: 50, width: 40, height: 30 },
      { x: 130, y: 50, width: 40, height: 30 },
    ],
    projectiles: [
      { x: 398, y: 500, width: 4, height: 10, type: 'regular', aliensHit: 0 },
    ],
    score,
    highscores: [
      { score: 100, initials: 'ABC', timestamp: 1000 },
      { score: 90, initials: 'DDD', timestamp: 2000 },
    ],
    showHighscoreOverlay,
    awaitingInitials,
    shipSelectionOptions: [
      { type: 'regular', label: 'Regular ship', description: 'Standard speed, standard projectile.' },
      { type: 'slow', label: 'Slow ship', description: 'Slower movement; special projectile destroys up to three aliens per shot.' },
    ],
    selectedShipOption: 0,
  };
}

function insideBox([x, y, w, h], box) {
  return x >= box.x && y >= box.y && x + w <= box.x + box.width && y + h <= box.y + box.height;
}

describe('CanvasRenderer (MOD-rendering; ARC-002 draw order)', () => {
  it('clears the whole canvas', () => {
    const ctx = mockContext();
    const renderer = new CanvasRenderer(ctx);
    renderer.clear();
    assert.deepStrictEqual(ctx.calls, [{ method: 'clearRect', args: [0, 0, WIDTH, HEIGHT] }]);
  });

  it('draws the background over the full canvas in black', () => {
    const ctx = mockContext();
    const renderer = new CanvasRenderer(ctx);
    renderer.drawBackground();
    assert.strictEqual(ctx.fillStyle, '#000000');
    assert.deepStrictEqual(ctx.calls, [{ method: 'fillRect', args: [0, 0, WIDTH, HEIGHT] }]);
  });

  it('draws every alien inside its own box at its position', () => {
    const ctx = mockContext();
    const renderer = new CanvasRenderer(ctx);
    const boxes = [
      { x: 60, y: 50, width: 40, height: 30 },
      { x: 130, y: 50, width: 40, height: 30 },
    ];
    renderer.drawAliens(boxes);
    assert.ok(ctx.calls.every((c) => c.method === 'fillRect'));
    for (const box of boxes) {
      assert.ok(ctx.calls.some((c) => insideBox(c.args, box)), `alien at ${box.x} is drawn`);
    }
    assert.ok(ctx.calls.every((c) => boxes.some((box) => insideBox(c.args, box))));
  });

  it('draws the ship with type-appropriate visuals inside its box', () => {
    const shipBox = { x: 380, y: 560, width: 40, height: 30 };
    const drawn = {};
    for (const shipType of ['regular', 'slow']) {
      const ctx = mockContext();
      new CanvasRenderer(ctx).drawShip(380, 40, shipType);
      assert.ok(ctx.calls.length > 0, `the ${shipType} ship is drawn`);
      assert.ok(ctx.calls.every((c) => c.method === 'fillRect' && insideBox(c.args, shipBox)));
      drawn[shipType] = { fillStyle: ctx.fillStyle, calls: JSON.stringify(ctx.calls) };
    }
    assert.notStrictEqual(drawn.slow.fillStyle, drawn.regular.fillStyle);
    assert.notStrictEqual(drawn.slow.calls, drawn.regular.calls);
  });

  it('draws one rectangle per projectile', () => {
    const ctx = mockContext();
    const renderer = new CanvasRenderer(ctx);
    renderer.drawProjectiles([
      { x: 398, y: 500, width: 4, height: 10, type: 'regular', aliensHit: 0 },
      { x: 400, y: 400, width: 4, height: 10, type: 'special', aliensHit: 1 },
    ]);
    assert.deepStrictEqual(ctx.calls, [
      { method: 'fillRect', args: [398, 500, 4, 10] },
      { method: 'fillRect', args: [400, 400, 4, 10] },
    ]);
  });
});

describe('Renderer.draw order (MOD-rendering; ARC-002 back-to-front)', () => {
  it('renders clear, background, aliens, ship, projectiles in that order', () => {
    const ctx = mockContext();
    const dom = { score: fakeElement(), gameOver: fakeElement(), highscoreOverlay: fakeElement(), initialsPrompt: fakeElement(), shipSelection: fakeElement() };
    const renderer = new Renderer(ctx, dom);
    const state = baseState();
    renderer.render(state);
    const fillRects = ctx.calls.filter((c) => c.method === 'fillRect');
    const background = fillRects[0];
    assert.deepStrictEqual(background.args, [0, 0, WIDTH, HEIGHT]);
    const between = fillRects.slice(1, -1);
    const firstShipRect = between.findIndex((c) => insideBox(c.args, state.ship));
    const alienRects = between.slice(0, firstShipRect);
    const shipRects = between.slice(firstShipRect);
    const alienBoxes = state.aliens;
    assert.ok(alienRects.length >= alienBoxes.length);
    assert.ok(alienRects.every((c) => alienBoxes.some((box) => insideBox(c.args, box))));
    assert.ok(shipRects.length > 0);
    assert.ok(shipRects.every((c) => insideBox(c.args, state.ship)));
    const projectileRect = fillRects[fillRects.length - 1];
    assert.deepStrictEqual(projectileRect.args, [398, 500, 4, 10]);
    assert.strictEqual(ctx.calls[0].method, 'clearRect');
  });

  it('shows the numeric score and updates it after each alien destruction', () => {
    const ctx = mockContext();
    const scoreEl = fakeElement();
    const dom = { score: scoreEl, gameOver: fakeElement(), highscoreOverlay: fakeElement(), initialsPrompt: fakeElement(), shipSelection: fakeElement() };
    const renderer = new Renderer(ctx, dom);
    renderer.render(baseState({ score: 3 }));
    assert.strictEqual(scoreEl.textContent, 'Score: 3');
    renderer.render(baseState({ score: 7 }));
    assert.strictEqual(scoreEl.textContent, 'Score: 7');
  });
});

describe('ScoreDisplay (MOD-rendering; SCORE DISPLAY)', () => {
  it('writes the numeric score into its element', () => {
    const el = fakeElement();
    const display = new ScoreDisplay(el);
    display.update(0);
    assert.strictEqual(el.textContent, 'Score: 0');
    display.update(42);
    assert.strictEqual(el.textContent, 'Score: 42');
  });
});

describe('ShipSelectionScreen (MOD-rendering; PLAYER SHIP SELECTION / PLAYER SHIP TYPE REGULAR/SLOW)', () => {
  it('renders both ship types with characteristics and highlights the selected option', () => {
    const el = fakeElement();
    const screen = new ShipSelectionScreen(el);
    screen.render(baseState().shipSelectionOptions, 1);
    assert.ok(el.innerHTML.includes('<div class="option">Regular ship — Standard speed, standard projectile.</div>'));
    assert.ok(el.innerHTML.includes('<div class="option selected">Slow ship — Slower movement; special projectile destroys up to three aliens per shot.</div>'));
  });

  it('shows and hides (toggles the `show` class the page CSS displays)', () => {
    const el = fakeElement();
    const screen = new ShipSelectionScreen(el);
    screen.show();
    assert.ok(el.classList.contains('show'), 'show() must add the `show` class');
    screen.hide();
    assert.ok(!el.classList.contains('show'), 'hide() must remove the `show` class');
  });
});

describe('GameOverScreen (MOD-rendering; SESSION HIGHSCORE DISPLAY GAMEOVER)', () => {
  it('shows the final score and the highscore list', () => {
    const el = fakeElement();
    const screen = new GameOverScreen(el);
    screen.show(42, [{ score: 42, initials: 'XYZ', timestamp: 1700 }]);
    assert.ok(el.textContent.includes('42'), 'final score visible');
    assert.ok(el.textContent.includes('XYZ'), 'highscore initials visible');
  });

  it('hides', () => {
    const el = fakeElement();
    el.textContent = 'visible';
    const screen = new GameOverScreen(el);
    screen.hide();
    assert.strictEqual(el.textContent, '');
  });
});

describe('HighscoreOverlay (MOD-rendering; SESSION HIGHSCORE DISPLAY INGAME)', () => {
  it('shows the list when opened and hides when closed', () => {
    const el = fakeElement();
    const overlay = new HighscoreOverlay(el);
    overlay.show([{ score: 55, initials: 'AAA', timestamp: 1 }]);
    assert.ok(el.classList.contains('show'), 'show() must add the `show` class');
    assert.ok(el.textContent.includes('AAA'));
    assert.ok(el.textContent.includes('55'));
    overlay.hide();
    assert.ok(!el.classList.contains('show'), 'hide() must remove the `show` class');
    assert.strictEqual(el.textContent, '');
  });
});

describe('InitialsPrompt (MOD-rendering; SESSION HIGHSCORE DATA)', () => {
  it('shows/hides and invokes the callback with the entered initials', () => {
    const el = fakeElement();
    const prompt = new InitialsPrompt(el);
    let result;
    prompt.show((initials) => { result = initials; });
    assert.ok(el.classList.contains('show'), 'show() must add the `show` class');
    el.value = 'XY';
    prompt.submit();
    assert.strictEqual(result, 'XY');
    assert.ok(!el.classList.contains('show'), 'hide() must remove the `show` class');
    el.value = '';
    prompt.show((initials) => { result = initials; }); // re-arm after hide
    prompt.submit();
    assert.strictEqual(result, 'AAA'); // empty initials default to AAA
  });
});

describe('Renderer phase overlays (MOD-rendering)', () => {
  it('shows the ship selection screen in the ShipSelection phase and hides overlays', () => {
    const ctx = mockContext();
    const dom = { score: fakeElement(), gameOver: fakeElement(), highscoreOverlay: fakeElement(), initialsPrompt: fakeElement(), shipSelection: fakeElement() };
    const renderer = new Renderer(ctx, dom);
    renderer.render(baseState({ phase: 'ShipSelection', selectedShipOption: 1 }));
    assert.ok(dom.shipSelection.classList.contains('show'), 'ship selection screen must be shown');
    assert.ok(dom.shipSelection.innerHTML.includes('Slow ship'));
    assert.strictEqual(dom.gameOver.textContent, '');
    assert.ok(!dom.highscoreOverlay.classList.contains('show'), 'other overlays must be hidden');
  });

  it('shows the game-over screen with final score and highscore list in the GameOver phase', () => {
    const ctx = mockContext();
    const dom = { score: fakeElement(), gameOver: fakeElement(), highscoreOverlay: fakeElement(), initialsPrompt: fakeElement(), shipSelection: fakeElement() };
    const renderer = new Renderer(ctx, dom);
    renderer.render(baseState({ phase: 'GameOver', score: 42 }));
    assert.ok(dom.gameOver.textContent.includes('42'));
    assert.ok(dom.gameOver.textContent.includes('ABC'));
    assert.ok(!dom.shipSelection.classList.contains('show'), 'ship selection must be hidden');
  });

  it('toggles the in-game highscore overlay via showHighscoreOverlay', () => {
    const ctx = mockContext();
    const dom = { score: fakeElement(), gameOver: fakeElement(), highscoreOverlay: fakeElement(), initialsPrompt: fakeElement(), shipSelection: fakeElement() };
    const renderer = new Renderer(ctx, dom);
    renderer.render(baseState({ phase: 'Playing', showHighscoreOverlay: true }));
    assert.ok(dom.highscoreOverlay.classList.contains('show'), 'highscore overlay must be shown');
    assert.ok(dom.highscoreOverlay.textContent.includes('ABC'));
    renderer.render(baseState({ phase: 'Playing', showHighscoreOverlay: false }));
    assert.ok(!dom.highscoreOverlay.classList.contains('show'), 'highscore overlay must be hidden');
  });

  it('delegates initials prompt display', () => {
    const ctx = mockContext();
    const dom = { score: fakeElement(), gameOver: fakeElement(), highscoreOverlay: fakeElement(), initialsPrompt: fakeElement(), shipSelection: fakeElement() };
    const renderer = new Renderer(ctx, dom);
    renderer.showInitialsPrompt(() => {});
    assert.ok(dom.initialsPrompt.classList.contains('show'), 'initials prompt must be shown');
    renderer.hideInitialsPrompt();
    assert.ok(!dom.initialsPrompt.classList.contains('show'), 'initials prompt must be hidden');
  });
});
