---
id: ITM-005
title: System verification: full-game playthrough and release tests
level: system
realises:
  - IMPLEMENTATION JAVASCRIPT WEB
  - GAMEPLAY HORIZONTAL MOVEMENT
  - GAMEPLAY DESCENDING MOVEMENT
  - PLAYER SHIP SELECTION
  - PLAYER SHIP TYPE REGULAR
  - PLAYER SHIP TYPE SLOW
  - PLAYER SHIP SLOW MOVEMENT
  - PLAYER SHIP SLOW SPECIAL SHOT
  - PLAYER MOVEMENT KEYS
  - PLAYER FIRE SPACEBAR
  - PROJECTILE TRAVEL
  - PROJECTILE REMOVAL
  - ALIEN DESTRUCTION
  - SCORE INCREMENT
  - GAME OVER CONDITION
  - SCORE DISPLAY
  - KISS NO EXTRA FEATURES
  - YAGNI NO UNNECESSARY ABSTRACTION
  - SESSION HIGHSCORE DATA
  - SESSION HIGHSCORE LIMIT
  - SESSION HIGHSCORE DISPLAY GAMEOVER
  - SESSION HIGHSCORE DISPLAY INGAME
  - SESSION HIGHSCORE RESET
modules:
  - MOD-input
  - MOD-game-logic
  - MOD-rendering
builds_on:
  - ITM-004
tests:
  - system
  - release
origin:
  - Waterfall verification phase; verifies all accepted requirements of akmaier/AlienInvasion
---

# ITM-005 System verification: full-game playthrough and release tests

## Outcome

The verification battery runs the real `index.html` in a browser (Playwright) for system/release tests and exercises the modules in Node (JSDOM) for unit tests. It covers every requirement guarded in the product SPEC: web implementation, alien horizontal and descending movement, ship selection, regular and slow ship types, slow-ship movement and special shot, player movement keys, spacebar fire, projectile travel and removal, alien destruction, score increment, game-over conditions, score display, and session highscore data/limit/display/reset. Release tests additionally confirm KISS NO EXTRA FEATURES (no power-ups, levels, sounds) and YAGNI NO UNNECESSARY ABSTRACTION (no unused classes/functions, each module provides a directly required capability).

## Acceptance

- All unit tests pass (module level, Node + JSDOM).
- All component/integration tests pass against the real `index.html` (Playwright).
- System/release tests pass: a full playthrough (ship selection -> play -> game-over -> restart) satisfies every accepted requirement.
- `tests/review/code_review.md` confirms no non-core features; `tests/review/architecture_review.md` confirms each module provides a directly required capability with no unused classes or functions.
- Every requirement in the product SPEC is guarded by a test (SPEC section 3, A REQUIREMENT NAMES ITS CHECK).