// Unit tests for the input module (src/input), ITM-001.
// Module under test: MOD-input (GameCommands, KeyboardHandler).
// Requirements exercised: PLAYER MOVEMENT KEYS, PLAYER FIRE SPACEBAR, PLAYER SHIP SELECTION.
// The module owns no game state; tests assert the GameCommands intent it emits from injected
// keydown/keyup events. Ship movement resulting from these commands is asserted in ITM-002.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createGameCommands, KeyboardHandler } from '../../src/input/index.js';

function event(code) {
  const prevented = [];
  return {
    code,
    preventDefault() {
      prevented.push(code);
    },
    prevented,
  };
}

function press(handler, code) {
  handler.onKeyDown(event(code));
}

describe('GameCommands (MOD-input; PLAYER MOVEMENT KEYS / PLAYER FIRE SPACEBAR / PLAYER SHIP SELECTION)', () => {
  it('is an immutable object holding exactly the five boolean command flags, all false by default', () => {
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

  it('accepts overridden flag values and stays immutable', () => {
    const commands = createGameCommands({ left: true, fire: true });
    assert.deepStrictEqual(Object.keys(commands).sort(), [
      'confirm',
      'fire',
      'highscoreToggle',
      'left',
      'right',
    ]);
    assert.strictEqual(commands.left, true);
    assert.strictEqual(commands.right, false);
    assert.strictEqual(commands.fire, true);
    assert.strictEqual(commands.confirm, false);
    assert.strictEqual(commands.highscoreToggle, false);
    assert.throws(() => {
      commands.left = false;
    }, TypeError);
    assert.strictEqual(Object.isFrozen(commands), true);
  });
});

describe('KeyboardHandler (MOD-input; PLAYER MOVEMENT KEYS)', () => {
  it('reports no intent before any key is pressed', () => {
    const handler = new KeyboardHandler();
    const commands = handler.getCommands();
    assert.deepStrictEqual(commands, {
      left: false,
      right: false,
      fire: false,
      confirm: false,
      highscoreToggle: false,
    });
  });

  it('sets left while ArrowLeft or KeyA is held and clears it on keyup', () => {
    const handler = new KeyboardHandler();
    press(handler, 'ArrowLeft');
    assert.strictEqual(handler.getCommands().left, true);
    assert.strictEqual(handler.getCommands().left, true); // still held next frame
    handler.onKeyUp(event('ArrowLeft'));
    assert.strictEqual(handler.getCommands().left, false);

    press(handler, 'KeyA');
    assert.strictEqual(handler.getCommands().left, true);
    handler.onKeyUp(event('KeyA'));
    assert.strictEqual(handler.getCommands().left, false);
  });

  it('sets right while ArrowRight or KeyD is held and clears it on keyup', () => {
    const handler = new KeyboardHandler();
    press(handler, 'ArrowRight');
    assert.strictEqual(handler.getCommands().right, true);
    handler.onKeyUp(event('ArrowRight'));
    assert.strictEqual(handler.getCommands().right, false);

    press(handler, 'KeyD');
    assert.strictEqual(handler.getCommands().right, true);
    handler.onKeyUp(event('KeyD'));
    assert.strictEqual(handler.getCommands().right, false);
  });

  it('reports both left and right when both movement keys are held (inputs cancel)', () => {
    const handler = new KeyboardHandler();
    press(handler, 'ArrowLeft');
    press(handler, 'KeyD');
    const commands = handler.getCommands();
    assert.strictEqual(commands.left, true);
    assert.strictEqual(commands.right, true);
  });
});

describe('KeyboardHandler (MOD-input; PLAYER FIRE SPACEBAR)', () => {
  it('emits fire for exactly one frame after Space goes down, not while held', () => {
    const handler = new KeyboardHandler();
    press(handler, 'Space');
    assert.strictEqual(handler.getCommands().fire, true);
    assert.strictEqual(handler.getCommands().fire, false); // held, edge cleared
    assert.strictEqual(handler.getCommands().fire, false);
    handler.onKeyUp(event('Space'));
    press(handler, 'Space');
    assert.strictEqual(handler.getCommands().fire, true);
    assert.strictEqual(handler.getCommands().fire, false);
  });

  it('ignores key repeats while Space is held (no projectile stream)', () => {
    const handler = new KeyboardHandler();
    press(handler, 'Space');
    press(handler, 'Space'); // repeat while held: ignored
    assert.strictEqual(handler.getCommands().fire, true);
    assert.strictEqual(handler.getCommands().fire, false);
  });

  it('emits confirm for exactly one frame after Enter or Space keydown', () => {
    const handler = new KeyboardHandler();
    press(handler, 'Enter');
    assert.strictEqual(handler.getCommands().confirm, true);
    assert.strictEqual(handler.getCommands().confirm, false);
    handler.onKeyUp(event('Enter'));
    press(handler, 'Space');
    assert.strictEqual(handler.getCommands().confirm, true);
    assert.strictEqual(handler.getCommands().confirm, false);
    handler.onKeyUp(event('Space'));
  });

  it('sets fire and confirm together on a single Space press', () => {
    const handler = new KeyboardHandler();
    press(handler, 'Space');
    const commands = handler.getCommands();
    assert.strictEqual(commands.fire, true);
    assert.strictEqual(commands.confirm, true);
    assert.strictEqual(handler.getCommands().fire, false);
    assert.strictEqual(handler.getCommands().confirm, false);
  });

  it('calls preventDefault on Space keydown but not on movement keys', () => {
    const handler = new KeyboardHandler();
    const space = event('Space');
    handler.onKeyDown(space);
    assert.deepStrictEqual(space.prevented, ['Space']);

    const left = event('ArrowLeft');
    handler.onKeyDown(left);
    assert.deepStrictEqual(left.prevented, []);

    const keyA = event('KeyA');
    handler.onKeyDown(keyA);
    assert.deepStrictEqual(keyA.prevented, []);
  });
});

describe('KeyboardHandler (MOD-input; PLAYER SHIP SELECTION)', () => {
  it('emits navigation and confirm commands usable during ShipSelection', () => {
    const handler = new KeyboardHandler();
    press(handler, 'ArrowRight'); // highlight next ship type
    assert.strictEqual(handler.getCommands().right, true);
    press(handler, 'Enter'); // confirm highlighted ship type
    const commands = handler.getCommands();
    assert.strictEqual(commands.confirm, true);
    assert.strictEqual(commands.right, true); // ArrowRight still held
    handler.onKeyUp(event('ArrowRight'));
    handler.onKeyUp(event('Enter'));
    assert.strictEqual(handler.getCommands().right, false);
    assert.strictEqual(handler.getCommands().confirm, false);
  });

  it('emits highscoreToggle for exactly one frame after KeyH keydown', () => {
    const handler = new KeyboardHandler();
    press(handler, 'KeyH');
    assert.strictEqual(handler.getCommands().highscoreToggle, true);
    assert.strictEqual(handler.getCommands().highscoreToggle, false);
    handler.onKeyUp(event('KeyH'));
    press(handler, 'KeyH');
    assert.strictEqual(handler.getCommands().highscoreToggle, true);
  });

  it('returns a fresh frozen GameCommands object on every frame', () => {
    const handler = new KeyboardHandler();
    press(handler, 'ArrowRight');
    const first = handler.getCommands();
    const second = handler.getCommands();
    assert.notStrictEqual(first, second);
    assert.strictEqual(Object.isFrozen(first), true);
    assert.strictEqual(Object.isFrozen(second), true);
    assert.strictEqual(first.right, true);
    assert.strictEqual(second.right, true);
    handler.onKeyUp(event('ArrowRight'));
    assert.strictEqual(handler.getCommands().right, false);
  });
});
