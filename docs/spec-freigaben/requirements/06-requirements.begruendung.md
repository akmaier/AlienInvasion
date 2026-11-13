# Requirements: restart button on the game-over screen

**The change.** Added GAME OVER RESTART BUTTON, GAME OVER RESTART BUTTON HIDDEN, GAME OVER RESTART NEW SESSION and SESSION START STATE; the rest of the section is as it stands.

**Why.** Issue #15 (akmaier/AlienInvasion, from mail `MAIL-0f25318ea822cc71`) asks for a restart button on the game-over screen that is visible only in the Game-Over state and that starts a new game session, identical to pressing the start button from the main menu, with score, alien formation, player ship and high-score list reset before the first level. akmaier asked to change the requirements as the issue asks. The issue's sentences map to the SPEC as follows:
- "visible only after the game has entered the Game-Over state" states two things — shown in Game-Over, hidden elsewhere — so it is two requirements: GAME OVER RESTART BUTTON and GAME OVER RESTART BUTTON HIDDEN.
- "starts a new game session" is GAME OVER RESTART NEW SESSION.
- "identical to pressing the start button from the main menu": the game has no main menu and no start button; a game session starts at the ship selection screen, which PLAYER SHIP SELECTION already requires at the start of every new game session. Nothing is added for it (nothing the SPEC already says).
- "reset … score, alien formation, player ship" is SESSION START STATE: one statement, the start state of every new session equals that of the first session after the page loads.
- "reset … high-score list" is already SESSION HIGHSCORE RESET ("reset to empty when a new game session starts"), which applies to the session the button starts; it is not repeated.
- "before commencing the first level": the game has no levels, and KISS NO EXTRA FEATURES excludes multiple levels; nothing is added.

**Impact list.**
- GAME OVER RESTART BUTTON, GAME OVER RESTART BUTTON HIDDEN, GAME OVER RESTART NEW SESSION, SESSION START STATE: added; nothing names them.
- SESSION HIGHSCORE RESET: unchanged in text, but its effect changes. Pull request #12 took "game session" to mean the page's session, so that the restart by Enter (`GameSession.startNewGame`, src/game-logic/GameSession.js) keeps the highscore list. The issue states that the restart starts a new game session *and* resets the high-score list; under this entry a restart by the button therefore empties the list. A list emptied at every restart only ever holds the entry of the game just ended, so SESSION HIGHSCORE LIMIT (at most ten entries) and SESSION HIGHSCORE DISPLAY INGAME show at most one entry. If the list is to be kept across restarts instead, this entry must be rejected and the issue's "high-score list" dropped.
- KISS NO EXTRA FEATURES: unchanged; the restart button is a feature a requirement now explicitly adds.
- PLAYER SHIP SELECTION: unchanged; it gives the screen the restarted session starts with.
- UC-004 (Game Ends) and the architecture notes ARC-004 (game state machine) and ARC-005 (session highscore storage) describe the restart by Enter that keeps the list; they will have to follow once this entry is accepted, as will GameOverScreen (src/rendering/GameOverScreen.js), which shows no button today.

**Origin.** Source github.com/akmaier. Issue #15, asked to be written into the requirements by akmaier in a conversation with a coding agent; proposed for akmaier's acceptance.
