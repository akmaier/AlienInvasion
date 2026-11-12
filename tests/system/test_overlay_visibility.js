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
import { createSession, createRenderer } from '../../game.js';
import { InitialsPrompt } from '../../src/rendering/index.js';

const OVERLAY_IDS = ['game-over', 'highscore-overlay', 'initials-prompt', 'ship-selection'];

/** One fake DOM element: classList, textContent/innerHTML, and child elements
 *  parsed from `innerHTML` so selector matching (incl. descendant selectors)
 *  works against the page's CSS cascade. */
function fakeElement(id, tagName, classes, parentNode) {
  const el = {
    id,
    tagName: tagName || 'DIV',
    style: {},
    _classes: new Set(classes || []),
    parentNode,
    _html: '',
    _text: '',
    value: '',
    _children: [],
    addEventListener() {},
    setAttribute() {},
    getAttribute() { return null; },
    querySelector() { return null; },
    querySelectorAll(selector) { return el._children.filter((child) => matches(child, selector)); },
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
    set(v) {
      el._html = String(v);
      el._text = String(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      el._children = parseChildren(el._html, el);
    },
  });
  return el;
}

/** Parses `<div class="...">text</div>` children out of an innerHTML assignment. */
function parseChildren(html, parentNode) {
  const children = [];
  const re = /<div[^>]*class="([^"]*)"[^>]*>([^<]*)<\/div>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const child = fakeElement(undefined, 'DIV', match[1].split(/\s+/).filter(Boolean), parentNode);
    child._text = match[2];
    children.push(child);
  }
  return children;
}

function overlayElement(id) {
  return fakeElement(id, 'DIV', ['overlay'], null);
}

function plainElement(id, tagName = 'DIV') {
  return fakeElement(id, tagName, [], null);
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

function baseState({ phase = 'Playing', score = 0, showHighscoreOverlay = false, awaitingInitials = false, highscores, selectedShipOption = 0 } = {}) {
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
    selectedShipOption,
  };
}

/** Reads the real index.html and extracts its <style> stylesheet text. */
function pageStylesheet() {
  const html = readFileSync('index.html', 'utf8');
  const match = html.match(/<style>([\s\S]*?)<\/style>/);
  assert.ok(match, 'index.html must contain a <style> element');
  return match[1];
}

/** Parses a stylesheet into rules: { selector, specificity, declarations }. */
function parseStyleRules(css) {
  const rules = [];
  for (const block of css.split('}')) {
    const open = block.indexOf('{');
    if (open === -1) continue;
    const selector = block.slice(0, open).trim();
    const declarations = {};
    for (const decl of block.slice(open + 1).split(';')) {
      const colon = decl.indexOf(':');
      if (colon === -1) continue;
      const prop = decl.slice(0, colon).trim().toLowerCase();
      const value = decl.slice(colon + 1).trim().toLowerCase();
      if (prop !== '') declarations[prop] = value;
    }
    if (selector !== '') {
      rules.push({ selector, specificity: selectorSpecificity(selector), declarations });
    }
  }
  return rules;
}

/** Computed `display`: inline style wins, then the page's cascade. */
function computedDisplay(element, rules) {
  const inline = String(element.style.display || '').trim();
  if (inline !== '') return inline;
  let best = null;
  for (const rule of rules) {
    if (matches(element, rule.selector) && rule.declarations.display !== undefined &&
        (!best || specCompare(rule.specificity, best.specificity) >= 0)) {
      best = rule;
    }
  }
  return best ? best.declarations.display : null;
}

/** Computed value of any CSS property: inline style wins, then the page's cascade. */
function computedStyle(element, prop, rules) {
  const inline = element.style[prop];
  if (inline !== undefined && String(inline).trim() !== '') return String(inline);
  rules = rules || RULES;
  let best = null;
  for (const rule of rules) {
    if (matches(element, rule.selector) && rule.declarations[prop] !== undefined &&
        (!best || specCompare(rule.specificity, best.specificity) >= 0)) {
      best = rule;
    }
  }
  return best ? best.declarations[prop] : null;
}

const css = pageStylesheet();
const RULES = parseStyleRules(css);

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

// Sanity check on the parser: the page really does hide .overlay and show .overlay.show.
it('parses the page CSS: .overlay is display:none, .overlay.show is display:block', () => {
  const overlay = RULES.find((r) => r.selector === '.overlay');
  const overlayShow = RULES.find((r) => r.selector === '.overlay.show');
  assert.ok(overlay, 'expected a `.overlay` rule');
  assert.ok(overlayShow, 'expected a `.overlay.show` rule');
  assert.strictEqual(overlay.declarations.display, 'none');
  assert.strictEqual(overlayShow.declarations.display, 'block');
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

/** Asserts that exactly one of the two ship options is highlighted the way the
 *  page CSS intends: the selected one via `#ship-selection .option.selected`,
 *  the other only via `#ship-selection .option`. */
function assertSelectedHighlighted(dom, selectedIndex) {
  const options = dom.shipSelection.querySelectorAll('.option');
  assert.strictEqual(options.length, 2, 'two ship options are rendered');
  options.forEach((option, index) => {
    if (index === selectedIndex) {
      assert.strictEqual(computedStyle(option, 'background'), '#222', `option ${index} has the highlighted background`);
      assert.strictEqual(computedStyle(option, 'border-color'), '#fff', `option ${index} has the highlighted border`);
    } else {
      assert.strictEqual(computedStyle(option, 'background'), '#111', `option ${index} keeps the default background`);
      assert.strictEqual(computedStyle(option, 'border-color'), null, `option ${index} is not highlighted`);
    }
  });
}

describe('Ship selection highlight on the real page (MOD-rendering; PLAYER SHIP SELECTION, UC-007 A2)', () => {
  it('highlights the selected ship option with the page CSS', () => {
    const ctx = mockContext();
    const dom = newDom();
    const renderer = createRenderer(ctx, dom);
    renderer.render(baseState({ phase: 'ShipSelection', selectedShipOption: 1 }));

    const options = dom.shipSelection.querySelectorAll('.option');
    assert.strictEqual(options.length, 2, 'both ship options are rendered');
    assert.ok(options[0].classList.contains('option'), 'the regular option carries the `option` class');
    assert.ok(options[1].classList.contains('option'), 'the slow option carries the `option` class');
    assert.ok(!options[0].classList.contains('selected'), 'the regular option is not selected');
    assert.ok(options[1].classList.contains('selected'), 'the slow option is selected');
    assert.ok(options[0]._text.includes('Regular ship'), 'the first option is the regular ship');
    assert.ok(options[1]._text.includes('Slow ship'), 'the second option is the slow ship');
    assertSelectedHighlighted(dom, 1);
  });

  it('moves the highlight with the selection', () => {
    const ctx = mockContext();
    const dom = newDom();
    const renderer = createRenderer(ctx, dom);

    renderer.render(baseState({ phase: 'ShipSelection', selectedShipOption: 0 }));
    assertSelectedHighlighted(dom, 0);

    renderer.render(baseState({ phase: 'ShipSelection', selectedShipOption: 1 }));
    assertSelectedHighlighted(dom, 1);
  });
});

describe('Full playthrough visibility on the real page (MOD-rendering + MOD-game-logic; UC-001 .. UC-008)', () => {
  it('shows selection, play, game over, initials, highscores and a cleared restart in their phases', () => {
    const ctx = mockContext();
    const dom = newDom();
    const renderer = createRenderer(ctx, dom);
    const session = createSession({ screenWidth: 800, screenHeight: 600 });

    const idle = () => ({ left: false, right: false, fire: false, confirm: false, highscoreToggle: false });
    const step = (commands) => { const state = session.update(commands); renderer.render(state); return state; };

    // 1. Ship selection at start; the first option is highlighted
    let state = step(idle());
    assert.strictEqual(state.phase, 'ShipSelection');
    assert.strictEqual(computedDisplay(dom.shipSelection, RULES), 'block', 'ship selection screen is displayed');
    assertSelectedHighlighted(dom, 0);
    assert.strictEqual(computedDisplay(dom.gameOver, RULES), 'none');
    assert.strictEqual(computedDisplay(dom.highscoreOverlay, RULES), 'none');
    assert.strictEqual(computedDisplay(dom.initialsPrompt, RULES), 'none');

    // 2. Move the selection to the slow ship; the highlight moves with it
    state = step({ ...idle(), right: true });
    assert.strictEqual(state.selectedShipOption, 1);
    assertSelectedHighlighted(dom, 1);
    assert.strictEqual(computedDisplay(dom.shipSelection, RULES), 'block');

    // 3. Confirm -> Playing: canvas and score visible, no overlay
    state = step({ ...idle(), confirm: true });
    assert.strictEqual(state.phase, 'Playing');
    assert.strictEqual(session.ship.shipType, 'slow', 'the chosen ship type is active');
    assert.strictEqual(computedDisplay(dom.canvas, RULES), 'block', 'the canvas is displayed during play');
    assert.notStrictEqual(computedDisplay(dom.score, RULES), 'none', 'the score is displayed during play');
    assert.strictEqual(computedDisplay(dom.shipSelection, RULES), 'none');
    assert.strictEqual(computedDisplay(dom.gameOver, RULES), 'none');
    assert.strictEqual(computedDisplay(dom.initialsPrompt, RULES), 'none');

    // 4. Highscore overlay in-game ('H'), opened and closed
    session.toggleHighscoreOverlay();
    state = step(idle());
    assert.strictEqual(computedDisplay(dom.highscoreOverlay, RULES), 'block', 'highscore overlay is displayed in-game');
    session.toggleHighscoreOverlay();
    state = step(idle());
    assert.strictEqual(computedDisplay(dom.highscoreOverlay, RULES), 'none', 'highscore overlay is hidden again');

    // 5. Game over: an alien reaches the bottom
    session.formation.speed = 0;
    session.formation.aliens[0].y = session.ship.y - session.formation.aliens[0].height;
    state = step(idle());
    assert.strictEqual(state.phase, 'GameOver');
    assert.strictEqual(state.awaitingInitials, true);
    assert.strictEqual(computedDisplay(dom.gameOver, RULES), 'block', 'game-over screen is displayed');
    assert.ok(dom.gameOver.textContent.includes('Game Over'), 'game-over heading visible');
    assert.ok(dom.gameOver.textContent.includes(String(state.score)), 'final score visible');
    assert.strictEqual(computedDisplay(dom.shipSelection, RULES), 'none');

    // 6. Initials prompt shown while the game awaits initials (game.js wires
    // showInitialsPrompt the same way)
    const prompt = new InitialsPrompt(dom.initialsPrompt);
    prompt.show((initials) => {
      session.submitInitials(initials);
      renderer.hideInitialsPrompt();
    });
    assert.strictEqual(computedDisplay(dom.initialsPrompt, RULES), 'block', 'initials prompt is displayed');
    assert.strictEqual(computedDisplay(dom.highscoreOverlay, RULES), 'none');

    // 7. Enter initials -> submitted through the prompt and shown on the game-over screen
    dom.initialsPrompt.value = 'JMN';
    prompt.submit();
    assert.strictEqual(computedDisplay(dom.initialsPrompt, RULES), 'none', 'initials prompt is hidden after submit');
    assert.strictEqual(session.highscores.getEntries().length, 1, 'highscore entry stored');
    assert.strictEqual(session.highscores.getEntries()[0].initials, 'JMN', 'initials stored');
    renderer.render(session.getState());
    assert.ok(dom.gameOver.textContent.includes('JMN'), 'highscore entry visible on game-over screen');

    // 8. Restart -> ShipSelection again, score and highscores cleared
    state = step({ ...idle(), confirm: true });
    assert.strictEqual(state.phase, 'ShipSelection');
    assert.strictEqual(state.score, 0, 'score cleared on restart');
    assert.strictEqual(state.highscores.length, 0, 'highscores cleared on restart');
    assertSelectedHighlighted(dom, 0);
    assert.strictEqual(computedDisplay(dom.shipSelection, RULES), 'block', 'ship selection screen is displayed after restart');
    assert.strictEqual(computedDisplay(dom.gameOver, RULES), 'none');
    assert.strictEqual(computedDisplay(dom.initialsPrompt, RULES), 'none');
    assert.strictEqual(computedDisplay(dom.highscoreOverlay, RULES), 'none');
  });
});
