// System tests: overlays are actually visible on the real index.html page,
// computed from the page's own CSS. Runs in plain Node (CI has no browser;
// the game loop equivalent is test_playthrough.js). Module under test:
// MOD-rendering (src/rendering) together with index.html at the repository
// root. Requirements exercised:
//   PLAYER SHIP SELECTION (UC-007),
//   SESSION HIGHSCORE DISPLAY GAMEOVER (UC-006),
//   SESSION HIGHSCORE DISPLAY INGAME (UC-006),
//   SCORE DISPLAY (UC-005),
//   IMPLEMENTATION JAVASCRIPT WEB.
//
// Bug this test guards: index.html hides every overlay with
// `.overlay { display: none }` and only `.overlay.show { display: block }`
// displays one. The show() methods of the overlay screens set
// `element.style.display = ''`, which resets the inline style to the
// stylesheet value — `none` — so no overlay is ever displayed in the browser.
// The fix is to toggle the `show` class instead, which is what the page CSS
// was written for. This test loads the real index.html with its CSS, builds
// a minimal `display` cascade from it, runs the real rendering code against
// DOM elements seeded with the page's classes, and asserts the computed
// display of each overlay in each phase. A test that only reads
// `element.style.display` (as the older unit tests did) cannot catch this.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRenderer } from '../../game.js';

const OVERLAY_IDS = ['game-over', 'highscore-overlay', 'initials-prompt', 'ship-selection'];

function overlayElement(id) {
  const el = {
    id,
    tagName: 'DIV',
    style: {},
    _classes: new Set(['overlay']),
    parentNode: null,
    _html: '',
    _text: '',
    value: '',
    addEventListener() {},
    setAttribute() {},
    getAttribute() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  el.classList = {
    add(...c) { c.forEach((x) => el._classes.add(x)); },
    remove(...c) { c.forEach((x) => el._classes.delete(x)); },
    contains(c) { return el._classes.has(c); },
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

function plainElement(id, tagName = 'DIV') {
  const el = {
    id,
    tagName,
    style: {},
    _classes: new Set(),
    parentNode: null,
    _html: '',
    _text: '',
    value: '',
    addEventListener() {},
    setAttribute() {},
    getAttribute() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
  };
  el.classList = {
    add(...c) { c.forEach((x) => el._classes.add(x)); },
    remove(...c) { c.forEach((x) => el._classes.delete(x)); },
    contains(c) { return el._classes.has(c); },
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
    score: plainElement('score'),
    canvas: plainElement(undefined, 'canvas'),
    gameOver: overlayElement('game-over'),
    highscoreOverlay: overlayElement('highscore-overlay'),
    initialsPrompt: overlayElement('initials-prompt'),
    shipSelection: overlayElement('ship-selection'),
  };
}

function mockContext() {
  const ctx = {
    canvas: { width: 800, height: 600 },
    clearRect() {},
    fillRect() {},
    fillText() {},
    fillStyle: null,
  };
  return ctx;
}

function baseState({ phase = 'Playing', score = 0, showHighscoreOverlay = false, awaitingInitials = false, highscores } = {}) {
  return {
    phase,
    ship: { x: 380, y: 560, width: 40, height: 30, shipType: 'regular' },
    aliens: [{ x: 60, y: 50, width: 40, height: 30 }],
    projectiles: [],
    score,
    highscores: highscores ?? [
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

/** Reads the real index.html and extracts its <style> stylesheet text. */
function pageStylesheet() {
  const html = readFileSync('index.html', 'utf8');
  const match = html.match(/<style>([\s\S]*?)<\/style>/);
  assert.ok(match, 'index.html must contain a <style> element');
  return match[1];
}

/** Parses a stylesheet into display rules: { selector, specificity, display }. */
function parseDisplayRules(css) {
  const rules = [];
  for (const block of css.split('}')) {
    const open = block.indexOf('{');
    if (open === -1) continue;
    const selector = block.slice(0, open).trim();
    let display = null;
    for (const decl of block.slice(open + 1).split(';')) {
      const colon = decl.indexOf(':');
      if (colon === -1) continue;
      const prop = decl.slice(0, colon).trim().toLowerCase();
      const value = decl.slice(colon + 1).trim().toLowerCase();
      if (prop === 'display') display = value;
    }
    if (selector && display !== null) {
      rules.push({ selector, specificity: selectorSpecificity(selector), display });
    }
  }
  return rules;
}

function selectorSpecificity(selector) {
  let best = [0, 0, 0];
  for (const part of selector.split(',')) {
    const spec = partSpecificity(part);
    if (specCompare(spec, best) > 0) best = spec;
  }
  return best;
}

function partSpecificity(part) {
  let ids = 0, classes = 0, tags = 0;
  for (const simple of part.trim().split(/\s+/)) {
    if (!simple) continue;
    let rest = simple;
    const tagMatch = rest.match(/^[a-zA-Z][a-zA-Z0-9]*/);
    if (tagMatch && !rest.startsWith('.') && !rest.startsWith('#') && !rest.startsWith('[') && !rest.startsWith(':')) {
      if (tagMatch[0] !== '*') tags++;
      rest = rest.slice(tagMatch[0].length);
    }
    ids += (rest.match(/#/g) || []).length;
    classes += (rest.match(/\./g) || []).length;
  }
  return [ids, classes, tags];
}

function specCompare(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function matchSimple(element, simple) {
  let rest = simple;
  const tagMatch = rest.match(/^[a-zA-Z][a-zA-Z0-9]*/);
  if (tagMatch && !rest.startsWith('.') && !rest.startsWith('#') && !rest.startsWith('[') && !rest.startsWith(':')) {
    if (tagMatch[0] !== '*' && String(element.tagName || '').toLowerCase() !== tagMatch[0].toLowerCase()) return false;
    rest = rest.slice(tagMatch[0].length);
  }
  const ids = rest.match(/#([\w-]+)/g) || [];
  for (const id of ids) {
    if (element.id !== id.slice(1)) return false;
  }
  const classes = rest.match(/\.[\w-]+/g) || [];
  for (const cls of classes) {
    if (!element.classList.contains(cls.slice(1))) return false;
  }
  return true;
}

function matches(element, selector) {
  return selector.split(',').some((part) => {
    const simples = part.trim().split(/\s+/).filter(Boolean);
    if (simples.length === 0) return false;
    if (!matchSimple(element, simples[simples.length - 1])) return false;
    // Descendant parts: every ancestor selector must match some ancestor.
    let ancestor = element.parentNode;
    for (let i = simples.length - 2; i >= 0; i--) {
      let found = false;
      while (ancestor && !found) {
        if (matchSimple(ancestor, simples[i])) found = true;
        else ancestor = ancestor.parentNode;
      }
      if (!found) return false;
      ancestor = ancestor.parentNode;
    }
    return true;
  });
}

/** Computed `display` for an element: inline style wins, then the page's cascade. */
function computedDisplay(element, rules) {
  const inline = String(element.style.display || '').trim();
  if (inline !== '') return inline;
  let best = null;
  for (const rule of rules) {
    if (matches(element, rule.selector) && (!best || specCompare(rule.specificity, best.specificity) >= 0)) {
      best = rule;
    }
  }
  return best ? best.display : null;
}

const css = pageStylesheet();
const RULES = parseDisplayRules(css);

// Sanity check on the parser: the page really does hide .overlay and show .overlay.show.
it('parses the page CSS: .overlay is display:none, .overlay.show is display:block', () => {
  const overlay = RULES.find((r) => r.selector === '.overlay');
  const overlayShow = RULES.find((r) => r.selector === '.overlay.show');
  assert.ok(overlay, 'expected a `.overlay` rule');
  assert.ok(overlayShow, 'expected a `.overlay.show` rule');
  assert.strictEqual(overlay.display, 'none');
  assert.strictEqual(overlayShow.display, 'block');
  assert.ok(specCompare(overlayShow.specificity, overlay.specificity) > 0, '`.overlay.show` must outrank `.overlay`');
});

describe('Computed overlay visibility on the real page (MOD-rendering)', () => {
  it('shows the ship selection screen and hides all other overlays in the ShipSelection phase', () => {
    const ctx = mockContext();
    const dom = newDom();
    const renderer = createRenderer(ctx, dom);
    const state = baseState({ phase: 'ShipSelection', selectedShipOption: 1 });
    renderer.render(state);

    assert.strictEqual(computedDisplay(dom.shipSelection, RULES), 'block', 'ship-selection must be displayed');
    assert.strictEqual(computedDisplay(dom.gameOver, RULES), 'none');
    assert.strictEqual(computedDisplay(dom.highscoreOverlay, RULES), 'none');
    assert.strictEqual(computedDisplay(dom.initialsPrompt, RULES), 'none');
    assert.ok(dom.shipSelection.innerHTML.includes('Regular ship'), 'regular ship option rendered');
    assert.ok(dom.shipSelection.innerHTML.includes('Slow ship'), 'slow ship option rendered');
    assert.ok(dom.shipSelection.innerHTML.includes('three aliens per shot'), 'slow ship description rendered');
  });

  it('shows the game-over screen with final score and highscores in the GameOver phase', () => {
    const ctx = mockContext();
    const dom = newDom();
    const renderer = createRenderer(ctx, dom);
    const state = baseState({
      phase: 'GameOver',
      score: 42,
      highscores: [{ score: 42, initials: 'XYZ', timestamp: 1700 }],
    });
    renderer.render(state);

    assert.strictEqual(computedDisplay(dom.gameOver, RULES), 'block', 'game-over must be displayed');
    assert.strictEqual(computedDisplay(dom.shipSelection, RULES), 'none');
    assert.strictEqual(computedDisplay(dom.highscoreOverlay, RULES), 'none');
    assert.strictEqual(computedDisplay(dom.initialsPrompt, RULES), 'none');
    assert.ok(dom.gameOver.textContent.includes('Game Over'), 'game-over heading visible');
    assert.ok(dom.gameOver.textContent.includes('42'), 'final score visible');
    assert.ok(dom.gameOver.textContent.includes('XYZ'), 'highscore initials visible');
  });

  it('shows the in-game highscore overlay via showHighscoreOverlay and hides it again', () => {
    const ctx = mockContext();
    const dom = newDom();
    const renderer = createRenderer(ctx, dom);

    renderer.render(baseState({ phase: 'Playing', showHighscoreOverlay: true }));
    assert.strictEqual(computedDisplay(dom.highscoreOverlay, RULES), 'block', 'highscore overlay must be displayed');
    assert.ok(dom.highscoreOverlay.textContent.includes('ABC'), 'highscore entries visible');
    assert.strictEqual(computedDisplay(dom.shipSelection, RULES), 'none');
    assert.strictEqual(computedDisplay(dom.gameOver, RULES), 'none');

    renderer.render(baseState({ phase: 'Playing', showHighscoreOverlay: false }));
    assert.strictEqual(computedDisplay(dom.highscoreOverlay, RULES), 'none', 'highscore overlay must be hidden');
  });

  it('shows the initials prompt when the game awaits initials and hides it afterwards', () => {
    const ctx = mockContext();
    const dom = newDom();
    const renderer = createRenderer(ctx, dom);

    renderer.showInitialsPrompt(() => {});
    assert.strictEqual(computedDisplay(dom.initialsPrompt, RULES), 'block', 'initials prompt must be displayed');
    assert.strictEqual(computedDisplay(dom.shipSelection, RULES), 'none');
    assert.strictEqual(computedDisplay(dom.gameOver, RULES), 'none');

    renderer.hideInitialsPrompt();
    assert.strictEqual(computedDisplay(dom.initialsPrompt, RULES), 'none', 'initials prompt must be hidden');
  });

  it('keeps the score and the canvas visible during play', () => {
    const ctx = mockContext();
    const dom = newDom();
    const renderer = createRenderer(ctx, dom);
    renderer.render(baseState({ phase: 'Playing', score: 7 }));

    assert.strictEqual(dom.score.textContent, 'Score: 7', 'score element shows the numeric score');
    assert.notStrictEqual(computedDisplay(dom.score, RULES), 'none', 'score must not be hidden by page CSS');
    assert.strictEqual(computedDisplay(dom.canvas, RULES), 'block', 'canvas must be displayed');
  });
});
