---
id: MOD-input
title: Input Module
folder: src/input
realises:
  - PLAYER MOVEMENT KEYS
  - PLAYER FIRE SPACEBAR
  - PLAYER SHIP SELECTION
  - UC-001
  - UC-007
follows:
  - ARC-001
uses: []
provides:
  - GameCommands
---

# MOD-input Input Module

## Responsibility

Translate raw keyboard events into canonical game commands for the Game Logic Layer. This module owns no game state; it only maps input to intent.

## Parts

- `KeyboardHandler` — Registers keydown/keyup listeners, tracks key state, emits `GameCommands` objects.
- `GameCommands` — Immutable data structure representing the player's intent for a single frame.

## Data

- Current key state: Set of pressed keys (ArrowLeft, ArrowRight, KeyA, KeyD, Space, Enter).
- No persistent data; state resets each frame after emitting commands.

## Interfaces

- **GameCommands**

```typescript
interface GameCommands {
  left: boolean;           // true when ArrowLeft or KeyA held (movement or ship selection navigation)
  right: boolean;          // true when ArrowRight or KeyD held (movement or ship selection navigation)
  fire: boolean;           // true on Space keydown (not hold) - fires projectile in playing state
  confirm: boolean;        // true on Enter/Space keydown (not hold) - confirms ship selection
  highscoreToggle: boolean; // true on H keydown (edge) - toggles highscore overlay
}
```

The Game Logic Layer calls `getCommands(): GameCommands` each frame to retrieve the current intent. **During ShipSelection phase, `left`/`right` navigate options and `confirm` selects the highlighted ship type. During Playing phase, `left`/`right` move the ship and `fire` shoots.**

## Files

- `src/input/KeyboardHandler.ts` — Implements event listeners, key-state tracking, and `getCommands()`.
- `src/input/GameCommands.ts` — Type definition for the `GameCommands` interface.
- `src/input/index.ts` — Public export barrel.

## Uses

- None (this is the bottom layer; it uses only browser DOM APIs).

```mermaid
classDiagram
    class KeyboardHandler {
        -pressedKeys: Set<string>
        +onKeyDown(event: KeyboardEvent): void
        +onKeyUp(event: KeyboardEvent): void
        +getCommands(): GameCommands
    }
    class GameCommands {
        +left: boolean
        +right: boolean
        +fire: boolean
        +confirm: boolean
        +highscoreToggle: boolean
    }
    KeyboardHandler --> GameCommands: creates
```