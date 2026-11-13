---
id: ARC-005
title: In-Memory Session Highscore Storage
refines: ARC-001
forced_by:
  - SESSION HIGHSCORE DATA
  - SESSION HIGHSCORE LIMIT
  - SESSION HIGHSCORE DISPLAY GAMEOVER
  - SESSION HIGHSCORE DISPLAY INGAME
  - SESSION HIGHSCORE RESET
  - KISS NO EXTRA FEATURES
  - YAGNI NO UNNECESSARY ABSTRACTION
  - UC-006
designs: []
---

# ARC-005 In-Memory Session Highscore Storage

## Context

The game must maintain a session highscore list of up to 10 entries, each containing score, initials (up to 3 chars), and timestamp. The list is displayed on the game-over screen and accessible during gameplay via 'H' key. It resets when a new session starts. No persistence across page reloads is required.

## Decision

A **single in-memory array** `highscores: HighscoreEntry[]` managed by a tiny module `highscore.js`.

```ts
interface HighscoreEntry {
  score: number;
  initials: string;  // 1–3 characters, uppercase
  timestamp: number; // Date.now()
}
```

- **Storage**: one `HighscoreStore` per `GameSession`; a `GameSession` is created once
  when the page loads (game.js `start()`) and holds the list of the current game
  session.
- **Insertion** (on game over):
  1. Prompt for initials (default "AAA" if empty/cancelled — UC-006 A1).
  2. Create entry `{ score, initials, timestamp: Date.now() }`.
  3. Push to array.
  4. Sort: `score` descending, then `timestamp` ascending (UC-006 A2).
  5. Slice to max 10 entries.
- **Access**: getter `getEntries(): HighscoreEntry[]` returns a copy.
- **Reset**: the list is emptied whenever a new game session starts — at page load
  and on every restart from the game-over screen; both run `startNewGame()`, which
  clears the store (SESSION HIGHSCORE RESET, GAME OVER RESTART NEW SESSION, UC-006).
- **No localStorage / IndexedDB / cookies** — SPEC says session-only.

## Alternatives

- **localStorage persistence** — rejected: SPEC explicitly requires reset on new session; persistence would violate SESSION HIGHSCORE RESET.
- **IndexedDB** — rejected: overkill for ≤10 small objects; adds async complexity.
- **Server-backed leaderboard** — rejected: no server in architecture (IMPLEMENTATION JAVASCRIPT WEB); violates YAGNI.
- **Class-based store with events** — rejected: adds abstraction for a 50-line module; violates YAGNI.

## Consequences

- **Positive**: zero dependencies, synchronous API, trivial to test (pure array operations), instant reset.
- **Negative**: data lost on page reload — accepted per SPEC.
- **Testability**: all operations are pure functions on arrays; unit tests verify sort order, limit, reset.
- **Extensibility**: adding fields (e.g., wave reached) means extending the interface; no storage migration needed.

```mermaid
flowchart TD
    GameOver[Game Over] --> Prompt[Prompt for Initials]
    Prompt --> CreateEntry[Create Entry: score, initials, timestamp]
    CreateEntry --> Insert[Push to Array]
    Insert --> Sort[Sort: Score Desc, Timestamp Asc]
    Sort --> Trim[Slice to Max 10]
    Trim --> DisplayGameOver[Display on Game-Over Screen]
    
    InGame[During Gameplay] --> PressH{Press H?}
    PressH -->|Yes| ShowOverlay[Show Highscore Overlay]
    ShowOverlay --> Read[Read getHighscores()]
    Read --> RenderList[Render List]
    
    NewSession[Page load] --> Empty[startNewGame: empty HighscoreStore]
    Restart[Restart after game over] --> Empty
```