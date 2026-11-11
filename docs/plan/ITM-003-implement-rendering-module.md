---
id: ITM-003
title: Implement rendering module
level: module
realises:
  - SCORE DISPLAY
  - SESSION HIGHSCORE DISPLAY GAMEOVER
  - SESSION HIGHSCORE DISPLAY INGAME
  - PLAYER SHIP SELECTION
  - PLAYER SHIP TYPE REGULAR
  - PLAYER SHIP TYPE SLOW
  - IMPLEMENTATION JAVASCRIPT WEB
modules:
  - MOD-rendering
builds_on:
  - ITM-002
tests:
  - unit
origin:
  - Waterfall implementation plan; implements accepted MOD-rendering (designed by ARC-002) realising UC-005, UC-006, UC-007, UC-008
---

# ITM-003 Implement rendering module

## Outcome

The Rendering module (`src/rendering/`) draws the current `GameState` to a single HTML5 `<canvas>` and manages DOM overlays for score, game-over screen, highscore list, initials prompt, and ship selection screen. Parts: `CanvasRenderer` (ship, aliens, projectiles; type-appropriate visuals), `ScoreDisplay` (DOM score element), `GameOverScreen` (final score + highscore list), `HighscoreOverlay` (in-game list via 'H'), `InitialsPrompt` (up to 3 characters), `ShipSelectionScreen` (options with characteristics + highlight), `Renderer` facade. Purely presentational — reads `GameState`, mutates no simulation state, per ARC-002 and MOD-rendering.

## Acceptance

- Files exist per MOD-rendering: CanvasRenderer.ts, ScoreDisplay.ts, GameOverScreen.ts, HighscoreOverlay.ts, InitialsPrompt.ts, ShipSelectionScreen.ts, Renderer.ts, index.ts.
- Unit tests (mock canvas context): `render(state)` draws background, aliens, ship, projectiles, score in the correct back-to-front order (ARC-002 draw order).
- Unit tests: score element shows the numeric score and updates after each alien destruction (SCORE DISPLAY).
- Unit tests: game-over screen shows final score and highscore list; highscore overlay opens/closes via 'H' (SESSION HIGHSCORE DISPLAY GAMEOVER/INGAME).
- Unit tests: ship selection screen shows regular and slow ship options with characteristics and highlights the selected option (PLAYER SHIP SELECTION, PLAYER SHIP TYPE REGULAR/SLOW).
- No simulation state or game rules live here (YAGNI NO UNNECESSARY ABSTRACTION).