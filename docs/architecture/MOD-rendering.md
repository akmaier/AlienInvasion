---
id: MOD-rendering
title: Rendering Module
folder: src/rendering
realises:
  - SCORE DISPLAY
  - SESSION HIGHSCORE DISPLAY GAMEOVER
  - SESSION HIGHSCORE DISPLAY INGAME
  - IMPLEMENTATION JAVASCRIPT WEB
  - PLAYER SHIP SELECTION
  - PLAYER SHIP TYPE REGULAR
  - PLAYER SHIP TYPE SLOW
  - UC-005
  - UC-006
  - UC-007
  - UC-008
follows:
  - ARC-002
uses:
  - MOD-game-logic.GameState
provides:
  - Renderer
---

# MOD-rendering Rendering Module

## Responsibility

Draw the current `GameState` to an HTML `<canvas>` and manage DOM overlays for score, game-over screen, highscore list, and ship selection screen. This module is purely presentational — it holds no game logic and mutates no simulation state.

## Parts

- `CanvasRenderer` — Draws ship, aliens, projectiles to canvas each frame. **Renders ship with type-appropriate visuals (regular vs slow).**
- `ScoreDisplay` — Updates a DOM element with the current score.
- `GameOverScreen` — Shows/hides the game-over overlay with final score and highscore list.
- `HighscoreOverlay` — Shows/hides the in-game highscore list overlay (triggered by 'H' key).
- `InitialsPrompt` — Prompts for player initials when a new highscore qualifies.
- `ShipSelectionScreen` — **Renders the ship selection UI showing available ship types with their characteristics, highlights the currently selected option.**
- `Renderer` — Facade coordinating all drawing and overlay management.

## Data

- Canvas context (2D).
- DOM element references: score element, game-over overlay, highscore overlay, initials input, **ship selection overlay**.
- No simulation state; reads only from `GameState` snapshot.

## Interfaces

- `Renderer` — Facade coordinating all drawing and overlay management.

```typescript
interface Renderer {
  render(state: GameState): void;
  showInitialsPrompt(callback: (initials: string) => void): void;
  submitInitials(): void;
  hideInitialsPrompt(): void;
}
```

The Game Logic Layer (via the main entry point) calls `render(state)` each frame. When `GameState.awaitingInitials` is true, the entry point calls `showInitialsPrompt` with a callback that forwards initials to `GameSession.submitInitials()`. **When `GameState.phase === 'ShipSelection'`, the `ShipSelectionScreen` renders the selection UI using `shipSelectionOptions` and `selectedShipOption`.**

## Files

- `src/rendering/CanvasRenderer.ts` — Canvas drawing operations for all entities, **ship type-specific rendering**.
- `src/rendering/ScoreDisplay.ts` — DOM score element updates.
- `src/rendering/GameOverScreen.ts` — Game-over overlay DOM management.
- `src/rendering/HighscoreOverlay.ts` — In-game highscore list overlay DOM management.
- `src/rendering/InitialsPrompt.ts` — Initials input dialog.
- `src/rendering/ShipSelectionScreen.ts` — **Ship selection UI rendering (options, highlights, descriptions).**
- `src/rendering/Renderer.ts` — Facade coordinating all renderers.
- `src/rendering/index.ts` — Public export barrel.

## Uses

- `MOD-game-logic.GameState` from MOD-game-logic.

```mermaid
classDiagram
    class Renderer {
        -canvas: CanvasRenderer
        -scoreDisplay: ScoreDisplay
        -gameOverScreen: GameOverScreen
        -highscoreOverlay: HighscoreOverlay
        -initialsPrompt: InitialsPrompt
        -shipSelectionScreen: ShipSelectionScreen
        +render(state: GameState): void
        +showInitialsPrompt(callback: (initials: string) => void): void
        +submitInitials(): void
        +hideInitialsPrompt(): void
    }
    class CanvasRenderer {
        -ctx: CanvasRenderingContext2D
        +drawShip(x, width, shipType): void
        +drawAliens(positions): void
        +drawProjectiles(positions): void
        +clear(): void
    }
    class ScoreDisplay {
        -element: HTMLElement
        +update(score: number): void
    }
    class GameOverScreen {
        -element: HTMLElement
        -highscoreElement: HTMLElement
        +show(finalScore, highscores): void
        +hide(): void
    }
    class HighscoreOverlay {
        -element: HTMLElement
        +show(highscores): void
        +hide(): void
    }
    class InitialsPrompt {
        -element: HTMLElement
        -callback: (initials: string) => void
        +show(callback): void
        +hide(): void
    }
    class ShipSelectionScreen {
        -element: HTMLElement
        +render(options, selectedIndex): void
        +show(): void
        +hide(): void
    }
    class GameState {
        +phase: Phase
        +ship: Position
        +aliens: Position[]
        +projectiles: Position[]
        +score: number
        +highscores: HighscoreEntry[]
        +showHighscoreOverlay: boolean
        +awaitingInitials: boolean
        +shipSelectionOptions: Option[]
        +selectedShipOption: number
    }
    Renderer --> CanvasRenderer
    Renderer --> ScoreDisplay
    Renderer --> GameOverScreen
    Renderer --> HighscoreOverlay
    Renderer --> InitialsPrompt
    Renderer --> ShipSelectionScreen
    Renderer ..> GameState: reads
```