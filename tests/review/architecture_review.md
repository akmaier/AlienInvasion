# Architecture review — YAGNI NO UNNECESSARY ABSTRACTION

Test level: release — guards YAGNI NO UNNECESSARY ABSTRACTION.

Static review of the source files for the YAGNI NO UNNECESSARY ABSTRACTION
requirement: no architectural abstraction (extra modules, classes, or inheritance
hierarchies) unless required to satisfy an existing requirement; each module must
provide a directly required capability; no unused classes or functions.

## Modules and their required capabilities

| Module | Files | Required capability (SPEC requirement) |
| --- | --- | --- |
| MOD-input | `src/input/{GameCommands,KeyboardHandler,index}.js` | Translate keyboard input into per-frame intent (PLAYER MOVEMENT KEYS, PLAYER FIRE SPACEBAR, PLAYER SHIP SELECTION). |
| MOD-game-logic | `src/game-logic/{GameSession,Ship,AlienFormation,ProjectileManager,CollisionSystem,ScoreCounter,HighscoreStore,GameState,index}.js` | All mutable game state and per-frame rules (alien movement/descent, alien hits and waves, ship types, projectiles, collisions, scoring, game-over, session highscores and their cookie). |
| MOD-rendering | `src/rendering/{CanvasRenderer,ScoreDisplay,GameOverScreen,HighscoreOverlay,InitialsPrompt,ShipSelectionScreen,Renderer,index}.js` | Draw GameState to one canvas and manage DOM overlays (SCORE DISPLAY, highscore displays, ship selection). |
| Entry point | `game.js`, `index.html` | Single HTML page, one JS module, requestAnimationFrame loop input -> update -> render -> UI (IMPLEMENTATION JAVASCRIPT WEB, ARC-001/ARC-004). |

## Review result

- One file per concern; no layering, no dependency injection, no framework, no
  entity-component-system, no state-machine library (rejected by ARC-001/ARC-004
  as violating YAGNI).
- Every class, function and file is exercised by at least one SPEC-guarded test;
  no unused classes or functions exist.
- The only variant in the codebase (regular vs. slow projectile) lives as a type
  flag plus a hit counter inside ProjectileManager/CollisionSystem (ARC-006) — no
  extra module or class hierarchy for it.

YAGNI NO UNNECESSARY ABSTRACTION holds for the current source tree.

## Reviewer

Static review of the files listed above; no test execution required.
