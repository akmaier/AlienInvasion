---
id: ITM-004
title: Implement entry point, main loop and module wiring
level: subsystem
realises:
  - IMPLEMENTATION JAVASCRIPT WEB
modules:
  - MOD-input
  - MOD-game-logic
  - MOD-rendering
integrates: ARC-001
builds_on:
  - ITM-001
  - ITM-002
  - ITM-003
tests:
  - component
origin:
  - Waterfall implementation plan; single HTML entry point + requestAnimationFrame loop per ARC-001
---

# ITM-004 Implement entry point, main loop and module wiring

## Outcome

`index.html` is the single HTML entry point loading one JavaScript module (`game.js`) with no build step. `game.js` wires the three modules into the requestAnimationFrame-driven game loop in this order each frame: (1) read input state, (2) update game state, (3) check game-over conditions, (4) render to canvas, (5) update UI. It owns the three-state machine (shipselection / playing / gameover) and its transitions: ShipSelection -> Playing on confirmed ship selection (`initializeGame`), Playing -> GameOver when an alien reaches the bottom or collides with the ship, GameOver -> ShipSelection on restart (`resetGame` clears entities, score, and highscore list). No server, no persistence, no extra features, per ARC-001, ARC-004 and IMPLEMENTATION JAVASCRIPT WEB.

## Acceptance

- `index.html` loads `game.js`; opening it in a browser displays the game with no server required (IMPLEMENTATION JAVASCRIPT WEB).
- Component tests: the main loop calls input -> update -> render each frame; game state advances (ARC-001 loop order).
- Integration tests: starting a game shows the ship selection screen; selecting a ship transitions to Playing with the ship at bottom centre; aliens move horizontally and descend; firing creates a projectile; destroying an alien increments the score; an alien reaching the bottom or colliding with the ship ends the game and shows the highscore list (UC-001..UC-008 end-to-end).
- Ship selection -> Playing -> GameOver -> ShipSelection transitions work; highscore list resets on new session (ARC-004, SESSION HIGHSCORE RESET).
- No feature beyond the core gameplay described in the SPEC (KISS NO EXTRA FEATURES); no unneeded abstraction (YAGNI).