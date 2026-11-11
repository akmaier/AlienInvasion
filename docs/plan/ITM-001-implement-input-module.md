---
id: ITM-001
title: Implement input module
level: module
realises:
  - PLAYER MOVEMENT KEYS
  - PLAYER FIRE SPACEBAR
  - PLAYER SHIP SELECTION
modules:
  - MOD-input
tests:
  - unit
origin:
  - Waterfall implementation plan; implements accepted MOD-input (designed by ARC-003) realising UC-001, UC-007, UC-008
---

# ITM-001 Implement input module

## Outcome

The Input module (`src/input/`) translates raw keyboard events into canonical `GameCommands` (`left`, `right`, `fire`, `confirm`, `highscoreToggle`). It registers `keydown`/`keyup` listeners on `window`, tracks pressed keys, and edge-detects Spacebar so exactly one projectile is created per press (holding does not create a stream) and edge-detects 'H' to toggle the highscore overlay. During ShipSelection, `left`/`right` navigate options and `confirm` selects the highlighted ship; during Playing, `left`/`right` move the ship and `fire` shoots. The module owns no game state — it only maps input to intent, per ARC-003 and MOD-input.

## Acceptance

- `src/input/KeyboardHandler.ts` and `src/input/GameCommands.ts` exist; `GameCommands` is an immutable interface with `left`, `right`, `fire`, `confirm`, `highscoreToggle` (all boolean).
- Unit tests inject `ArrowLeft`/`ArrowRight`/`A`/`D` keydown/keyup events and assert the ship's x-position changes accordingly and stays within screen bounds (PLAYER MOVEMENT KEYS).
- Unit tests inject a Spacebar keydown and confirm exactly one projectile is created; holding Spacebar does not create a stream (PLAYER FIRE SPACEBAR).
- During ShipSelection, `left`/`right` navigate options and `confirm` selects the highlighted ship type (PLAYER SHIP SELECTION).
- No game-simulation state lives in this module (YAGNI NO UNNECESSARY ABSTRACTION).