# Requirements: adds SESSION_HIGHSCORE_DATA; adds SESSION_HIGHSCORE_LIMIT; adds SESSION_HIGHSCORE_DISPLAY_GAMEOVER; adds SESSION_HIGHSCORE_DISPLAY_INGAME; adds SESSION_HIGHSCORE_RESET

**The change.** adds SESSION_HIGHSCORE_DATA; adds SESSION_HIGHSCORE_LIMIT; adds SESSION_HIGHSCORE_DISPLAY_GAMEOVER; adds SESSION_HIGHSCORE_DISPLAY_INGAME; adds SESSION_HIGHSCORE_RESET. The rest of the section is carried over byte for byte.

**Why.** Drafted from github.com/akmaier on the person's instruction: SESSION_HIGHSCORE_DATA: The session highscore list shall store for each entry the player's score, initials (up to three characters), and a timestamp. · SESSION_HIGHSCORE_LIMIT: The session highscore list shall keep at most ten entries, sorted by score descending. · SESSION_HIGHSCORE_DISPLAY_GAMEOVER: The session highscore list shall be displayed on the game-over screen. · SESSION_HIGHSCORE_DISPLAY_INGAME: The session highscore list shall be accessible on demand during gameplay. · SESSION_HIGHSCORE_RESET: The session highscore list shall reset to empty when a new game session starts.

**Impact list.**
- SESSION_HIGHSCORE_DATA: new; nothing names it yet.
- SESSION_HIGHSCORE_LIMIT: new; nothing names it yet.
- SESSION_HIGHSCORE_DISPLAY_GAMEOVER: new; nothing names it yet.
- SESSION_HIGHSCORE_DISPLAY_INGAME: new; nothing names it yet.
- SESSION_HIGHSCORE_RESET: new; nothing names it yet.

**Origin.** Source github.com/akmaier, passages: Add a requirement for a session-only highscore list to the Alien Invasion game's SPEC.md. The highscore list should track scores during the current game session only (not persisted across sessions). Define the requirement as a binding invariant including: what data is stored (score, possibly player name/initials, timestamp), how many entries are kept, display/access rules, and that it resets on new session/game start.. Asked in a conversation in the prompt bar.

**Provenance.** Agent M 48e7feef66077ec2f6b562e3447c4605cd99f4af, commit 48e7feef66077ec2f6b562e3447c4605cd99f4af; participant nvidia/nemotron-3-ultra-550b-a55b; model nvidia/nemotron-3-ultra-550b-a55b; 2026-11-08; correction rounds: 4.
