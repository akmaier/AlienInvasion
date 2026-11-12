# Requirements: GAME END ALL ALIENS DESTROYED

**The change.** Added GAME END ALL ALIENS DESTROYED; the rest of the section is as it stands.

**Why.** akmaier asked: "Why doesn't the game end with all invaders destroyed?" GAME OVER CONDITION ends the game only when an alien reaches the bottom of the screen or collides with the ship, so a player who destroys every alien is left on an empty screen with no end. The new requirement states the missing end as a single statement, beside GAME OVER CONDITION; the end shows as a game over does, so the final score, the initials and the session highscores of SESSION HIGHSCORE DISPLAY GAMEOVER apply unchanged. KISS NO EXTRA FEATURES: no new wave or level is added.

**Impact list.**
- GAME END ALL ALIENS DESTROYED: added; nothing names it.
- GAME OVER CONDITION: unchanged; the code's `checkGameOver` (src/game-logic/GameSession.js) returns early when no alien is left and will have to end the game there.

**Origin.** Source github.com/akmaier. Asked by akmaier in a conversation with the coordinating agent; proposed for akmaier's acceptance.
