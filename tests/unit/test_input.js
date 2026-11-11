// Unit tests for the input module (src/input), ITM-001.
// Covers: PLAYER MOVEMENT KEYS, PLAYER FIRE SPACEBAR, PLAYER SHIP SELECTION
// Module under test: MOD-input (KeyboardHandler, GameCommands).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createGameCommands, KeyboardHandler } from '../../src/input/index.js';

function keyEvent(code, preventDefaultCalled = []) {
  return {
    code,
    preventDefault() {
      preventDefaultCalled.push(code);
    },
  };
}

function press(handler, code) {
  const preventDefaultCalled = [];
  handler.onKeyDown({ code, preventDefault() { preventDefaultCalled.push(code); } });
  return preventDefaultCalled;
}

function release(handler, code) {
  handler.onKeyUp({ code });
}

describe('GameCommands', () => {
  it('is an immutable object with exactly the five boolean flags, all false by default', () => {
    const commands = createGameCommands();
    assert.strictEqual(Object.isFrozen(commands), true);
    assert.deepStrictEqual(Object.keys(commands).sort(), [
      'confirm',
      'fire',
      'highscoreToggle',
      'left',
      'right',
    ]);
    for (const value of Object.values(commands)) {
      assert.strictEqual(typeof value, 'boolean');
      assert.strictEqual(value, false);
    }
  });

  it('accepts overridden flag values', () => {
    const commands = createGameCommands({ left: true, fire: true });
    assert.strictEqual(commands.left, true);
    assert.strictEqual(commands.right, false);
    assert.strictEqual(commands.fire, true);
    assert.strictEqual(commands.confirm, false);
    assert.strictEqual(commands.highscoreToggle, false);
    assert.strictEqual(Object.isFrozen(commands), true);
  });
});

describe('KeyboardHandler', () => {
  it('reports no intent before any key is pressed', () => {
    const handler = new KeyboardHandler();
    const commands = handler.getCommands();
    assert.deepStrictEqual(commands, { left: false, right: false, fire: false, confirm: false, highscoreToggle: false });
  });

  it('sets left on ArrowLeft or KeyA keydown and clears it on keyup', () => {
    const handler = new KeyboardHandler();
    press(handler, 'ArrowLeft');
    assert.strictEqual(handler.getCommands().left, true);
    assert.strictEqual(handler.getCommands().left, true); // still held
    release(handler, 'ArrowLeft');
    assert.strictEqual(handler.getCommands().left, false);

    press(handler, 'KeyA');
    assert.strictEqual(handler.getCommands().left, true);
    release(handler, 'KeyA');
    assert.strictEqual(handler.getCommands().left, false);
  });

  it('sets right on ArrowRight or KeyD keydown and clears it on keyup', () => {
    const handler = new KeyboardHandler();
    press(handler, 'ArrowRight');
    assert.strictEqual(handler.getCommands().right, true);
    release(handler, 'ArrowRight');
    assert.strictEqual(handler.getCommands().right, false);

    press(handler, 'KeyD');
    assert.strictEqual(handler.getCommands().right, true);
    release(handler, 'KeyD');
    assert.strictEqual(handler.getCommands().right, false);
  });

  it('reports both left and right when both movement keys are held', () => {
    const handler = new KeyboardHandler();
    press(handler, 'ArrowLeft');
    press(handler, 'KeyD');
    const commands = handler.getCommands();
    assert.strictEqual(commands.left, true);
    assert.strictEqual(commands.right, true);
  });

  it('emits fire for exactly one frame after Space goes down, not while held', () => {
    const handler = new KeyboardHandler();
    press(handler, 'Space');
    assert.strictEqual(handler.getCommands().fire, true);
    assert.strictEqual(handler.getCommands().fire, false);
    assert.strictEqual(handler.getCommands().fire, false);
    release(handler, 'Space');
    press(handler, 'Space');
    assert.strictEqual(handler.getCommands().fire, true);
    assert.strictEqual(handler.getCommands().fire, false);
  });

  it('emits confirm for exactly one frame after Enter or Space goes down', () => {
    const handler = new KeyboardHandler();
    press(handler, 'Enter');
    assert.strictEqual(handler.getCommands().confirm, true);
    assert.strictEqual(handler.getCommands().confirm, false);
    release(handler, 'Enter');

    press(handler, 'Space');
    assert.strictEqual(handler.getCommands().confirm, true);
    assert.strictEqual(handler.getCommands().confirm, false);
    release(handler, 'Space');
  });

  it('sets both fire and confirm on a single Space press', () => {
    const handler = new KeyboardHandler();
    press(handler, 'Space');
    const commands = handler.getCommands();
    assert.strictEqual(commands.fire, true);
    assert.strictEqual(commands.confirm, true);
    assert.strictEqual(handler.getCommands().fire, false);
    assert.strictEqual(handler.getCommands().confirm, false);
  });

  it('emits highscoreToggle for exactly one frame after H keydown', () => {
    const handler = new KeyboardHandler();
    press(handler, 'KeyH');
    assert.strictEqual(handler.getCommands().highscoreToggle, true);
    assert.strictEqual(handler.getCommands().highscoreToggle, false);
    assert.strictEqual(handler.getCommands().highscoreToggle, false);
    release(handler, 'KeyH');
    press(handler, 'KeyH');
    assert.strictEqual(handler.getCommands().highscoreToggle, true);
  });

  it('calls preventDefault on Space keydown but not on movement keys', () => {
    const handler = new KeyboardHandler();
    const spacePrevented = press(handler, 'Space');
    assert.deepStrictEqual(spacePrevented, ['Space']);

    const arrowPrevented = press(handler, 'ArrowLeft');
    assert.deepStrictEqual(arrowPrevented, []);

    const wasdPrevented = press(handler, 'KeyA');
    assert.deepStrictEqual(wasdPrevented, []);
  });

  it('returns a fresh immutable GameCommands object on every frame', () => {
    const handler = new KeyboardHandler();
    press(handler, 'ArrowRight');
    const first = handler.getCommands();
    const second = handler.getCommands();
    assert.notStrictEqual(first, second);
    assert.strictEqual(Object.isFrozen(first), true);
    assert.strictEqual(Object.isFrozen(second), true);
    assert.strictEqual(first.right, true);
    assert.strictEqual(second.right, true); // still held
    release(handler, 'ArrowRight');
    assert.strictEqual(handler.getCommands().right, false);
  });
});
