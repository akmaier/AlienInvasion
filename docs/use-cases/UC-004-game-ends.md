---
id: UC-004
title: Game Ends
area: Gameplay
actors:
  - System
  - Player
realises:
  - GAME OVER CONDITION
  - GAME OVER RESTART BUTTON
  - GAME OVER RESTART BUTTON HIDDEN
  - GAME OVER RESTART NEW SESSION
---

# UC-004 Game Ends

## Actors

- System
- Player

## Precondition

- Game is in the playing state.
- Alien formation exists (UC-002).
- Player's ship exists (UC-001).

## Main flow

1. System detects that any alien has reached the bottom of the screen (y‑position ≥ ship's y‑position).
2. System switches game state to Game‑Over.
3. All entity spawning stops.
4. Game‑Over screen is displayed.
5. Session highscore list is shown (see UC-006).
6. Game‑Over screen shows a restart button; no restart button is shown in any other state.
7. Player clicks the restart button.
8. System starts a new game session: the ship selection screen is shown (UC-007), with score, alien formation and player's ship as on page load, the game at wave 1 (UC-009) and the session highscore list keeping its entries (UC-006).

## Alternative flows

- **A1: Alien collides with ship** — System detects bounding-box intersection between any alien and the player's ship.
  - Game state switches to Game‑Over (the game state switch step).
  - All entity spawning stops (the spawning stop step).
  - Game‑Over screen displayed (the game-over screen display step).
  - Session highscore list shown (the highscore list display step).

## Postcondition

- Game state is Game‑Over.
- No new aliens, projectiles, or other entities are spawned.
- Game‑Over screen with session highscore list and restart button is visible until the player restarts.
- After the restart, a new game session has started at the ship selection screen.

```mermaid
stateDiagram-v2
    [*] --> Playing
    Playing --> GameOver: alien reaches bottom
    Playing --> GameOver: alien collides with ship
    GameOver --> ShipSelection: player clicks restart (new game session)
```