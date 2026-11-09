---
id: MOD-game-logic
title: Game Logic Module
folder: src/game-logic
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
  - UC-002
  - UC-003
  - UC-004
  - UC-006
follows:
  - ARC-001
uses:
  - MOD-input.GameCommands
provides:
  - GameState
  - HighscoreList
  - GameSession
---

# MOD-game-logic Game Logic Module

## Responsibility

Own all mutable game state and simulate the game rules each frame. This includes: alien formation movement and descent, projectile physics, collision detection, scoring, game-over detection, and session highscore management. The module is pure simulation — it knows nothing about input devices or rendering.

## Parts

- `GameSession` — Orchestrates the game loop: receives `GameCommands`, updates simulation, produces `GameState`. Manages game phases (Playing, GameOver).
- `AlienFormation` — Stores alien grid positions, moves horizontally, reverses at edges, descends.
- `Ship` — Stores ship horizontal position, clamps to screen bounds.
- `ProjectileManager` — Spawns, moves, and removes projectiles; detects collisions with aliens.
- `CollisionSystem` — Detects projectile-alien and alien-ship/ground collisions.
- `ScoreCounter` — Tracks current score; increments on alien destruction.
- `HighscoreStore` — Manages session highscore list (max 10 entries, sorted by score desc, timestamp asc tie-break); persists across games within a session; resets on new session.
- `GameState` — Immutable snapshot exposed to Rendering Layer each frame.

## Data

- `AlienFormation`: 2D array of alien positions (x, y), formation direction (+1/-1), speed, descent step.
- `Ship`: x position (clamped to screen width), width.
- `ProjectileManager`: array of active projectiles (x, y, speed).
- `ScoreCounter`: integer score.
- `HighscoreStore`: array of `{ score: number, initials: string, timestamp: number }`, max length 10.
- `GameSession`: current phase (Playing | GameOver), final score of last game, awaiting initials flag.

## Interfaces

- **GameState** (read-only snapshot for Rendering)

```typescript
interface GameState {
  phase: 'Playing' | 'GameOver';
  ship: { x: number; width: number };
  aliens: Array<{ x: number; y: number; width: number; height: number }>;
  projectiles: Array<{ x: number; y: number }>;
  score: number;
  highscores: Array<{ score: number; initials: string; timestamp: number }>;
  showHighscoreOverlay: boolean;
  awaitingInitials: boolean;
}
```

- **HighscoreList**

```typescript
interface HighscoreList {
  entries: Array<{ score: number; initials: string; timestamp: number }>;
  addEntry(score: number, initials: string): void;
  getEntries(): Array<{ score: number; initials: string; timestamp: number }>;
  clear(): void;
}
```

- **GameSession**

```typescript
interface GameSession {
  update(commands: GameCommands): GameState;
  submitInitials(initials: string): void;
  startNewGame(): void;
  toggleHighscoreOverlay(): void;
}
```

The Input Layer calls `update(commands)` each frame. The Rendering Layer calls `getState(): GameState` each frame. Highscore overlay toggle and initials submission are triggered by UI events forwarded from Rendering.

## Files

- `src/game-logic/GameSession.ts` — Main orchestrator, game loop step.
- `src/game-logic/AlienFormation.ts` — Formation movement, edge reversal, descent.
- `src/game-logic/Ship.ts` — Ship position, clamping.
- `src/game-logic/ProjectileManager.ts` — Projectile spawning, movement, removal.
- `src/game-logic/CollisionSystem.ts` — Bounding-box collision checks.
- `src/game-logic/ScoreCounter.ts` — Score tracking.
- `src/game-logic/HighscoreStore.ts` — Session highscore list management.
- `src/game-logic/GameState.ts` — Snapshot type definition.
- `src/game-logic/index.ts` — Public export barrel.

## Uses

- `MOD-input.GameCommands` from MOD-input.

```mermaid
classDiagram
    class GameSession {
        -formation: AlienFormation
        -ship: Ship
        -projectiles: ProjectileManager
        -collision: CollisionSystem
        -score: ScoreCounter
        -highscores: HighscoreStore
        -phase: Phase
        +update(commands: GameCommands): GameState
        +submitInitials(initials: string): void
        +startNewGame(): void
        +toggleHighscoreOverlay(): void
    }
    class AlienFormation {
        -grid: Alien[][]
        -direction: number
        +step(): void
        +getPositions(): Position[]
    }
    class Ship {
        -x: number
        +move(left: boolean, right: boolean): void
        +getPosition(): Position
    }
    class ProjectileManager {
        -projectiles: Projectile[]
        +spawn(x: number): void
        +step(): void
        +getPositions(): Position[]
    }
    class CollisionSystem {
        +checkProjectileAlien(projectiles, aliens): Collision[]
        +checkAlienShip(aliens, ship): boolean
        +checkAlienGround(aliens): boolean
    }
    class ScoreCounter {
        -value: number
        +increment(): void
        +get(): number
        +reset(): void
    }
    class HighscoreStore {
        -entries: HighscoreEntry[]
        +addEntry(score, initials): void
        +getEntries(): HighscoreEntry[]
        +clear(): void
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
    }
    GameSession --> AlienFormation
    GameSession --> Ship
    GameSession --> ProjectileManager
    GameSession --> CollisionSystem
    GameSession --> ScoreCounter
    GameSession --> HighscoreStore
    GameSession --> GameState: produces
```