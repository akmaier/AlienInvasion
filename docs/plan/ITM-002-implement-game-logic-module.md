---
id: ITM-002
title: Implement game logic module
level: module
realises:
  - GAMEPLAY HORIZONTAL MOVEMENT
  - GAMEPLAY DESCENDING MOVEMENT
  - PROJECTILE TRAVEL
  - PROJECTILE REMOVAL
  - ALIEN DESTRUCTION
  - SCORE INCREMENT
  - GAME OVER CONDITION
  - SESSION HIGHSCORE DATA
  - SESSION HIGHSCORE LIMIT
  - SESSION HIGHSCORE RESET
  - PLAYER SHIP TYPE REGULAR
  - PLAYER SHIP TYPE SLOW
  - PLAYER SHIP SLOW MOVEMENT
  - PLAYER SHIP SLOW SPECIAL SHOT
modules:
  - MOD-game-logic
builds_on:
  - ITM-001
tests:
  - unit
origin:
  - Waterfall implementation plan; implements accepted MOD-game-logic (designed by ARC-004, ARC-006) realising UC-002, UC-003, UC-004, UC-006, UC-007, UC-008
---

# ITM-002 Implement game logic module

## Outcome

The Game Logic module (`src/game-logic/`) owns all mutable game state and simulates the game rules each frame. Parts: `GameSession` (orchestrates, phases ShipSelection/Playing/GameOver, ship-type selection and initialization), `AlienFormation` (grid, horizontal movement, edge reversal, descent), `Ship` (position clamped to bounds, type-specific movement speed), `ProjectileManager` (spawn/move/remove projectiles; regular destroys one alien, special slow-ship projectile destroys up to three per shot via a hit counter), `CollisionSystem` (bounding-box projectile-alien and alien-ship/ground checks), `ScoreCounter` (increments by one on alien destruction), `HighscoreStore` (session list, max 10 entries sorted by score desc / timestamp asc, resets on new session), `GameState` (immutable snapshot). Pure simulation — no input devices, no rendering, per ARC-001, ARC-004, ARC-006 and MOD-game-logic.

## Acceptance

- Files exist per MOD-game-logic: GameSession.ts, AlienFormation.ts, Ship.ts, ProjectileManager.ts, CollisionSystem.ts, ScoreCounter.ts, HighscoreStore.ts, GameState.ts, index.ts.
- Unit tests: alien rows move horizontally and reverse at screen edges, descending after each reversal (GAMEPLAY HORIZONTAL MOVEMENT, GAMEPLAY DESCENDING MOVEMENT).
- Unit tests: projectile moves upward at constant speed; removed on exiting viewport or on alien collision (PROJECTILE TRAVEL, PROJECTILE REMOVAL).
- Unit tests: alien removed on projectile collision; score increments by exactly one (ALIEN DESTRUCTION, SCORE INCREMENT).
- Unit tests: game ends when an alien reaches the bottom or collides with the ship; spawning stops (GAME OVER CONDITION).
- Unit tests: regular ship moves at standard speed; slow ship moves slower; slow-ship special projectile destroys up to three aliens per shot before removal (PLAYER SHIP TYPE REGULAR/SLOW, PLAYER SHIP SLOW MOVEMENT/SPECIAL SHOT).
- Unit tests: highscore entry holds score, initials (up to 3 chars), timestamp; list capped at 10 sorted by score desc; list clears on new session (SESSION HIGHSCORE DATA/LIMIT/RESET).
- No input or rendering code lives here (YAGNI NO UNNECESSARY ABSTRACTION).