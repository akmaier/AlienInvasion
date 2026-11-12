## Requirements

**IMPLEMENTATION JAVASCRIPT WEB** *(github.com/akmaier)*
The system shall be implemented as a client‑side web application using JavaScript runnable in a standard web browser.
*Check:* `tests/integration/test_web_implementation.py::test_client_side_application` verifies that the repository contains an index.html that loads a .js file and that opening index.html in a browser displays the game without requiring any server.

**GAMEPLAY HORIZONTAL MOVEMENT** *(github.com/akmaier)*
The game shall present rows of alien invaders moving horizontally across the screen.
*Check:* `tests/integration/test_alien_movement.py::test_horizontal_movement` observes that alien rows move left‑to‑right and reverse direction at the screen edges.

**GAMEPLAY DESCENDING MOVEMENT** *(github.com/akmaier)*
After reaching a screen edge, alien rows shall descend toward the player's ship.
*Check:* `tests/integration/test_alien_movement.py::test_descend_after_edge` verifies that rows move downward after hitting an edge.

**PLAYER SHIP SELECTION** *(github.com/akmaier)*
The game shall present a ship selection screen at the start of a new game session where the player chooses one of the available ship types.
*Check:* `tests/integration/test_ship_selection.py::test_ship_selection_screen` verifies that a selection screen is shown before gameplay starts and that the player can choose a ship type.

**PLAYER SHIP TYPE REGULAR** *(github.com/akmaier)*
The regular ship shall be an available ship type.
*Check:* `tests/integration/test_ship_types.py::test_regular_ship_available` verifies the regular ship appears as a selectable option.

**PLAYER SHIP TYPE SLOW** *(github.com/akmaier)*
The slow ship shall be an available ship type.
*Check:* `tests/integration/test_ship_types.py::test_slow_ship_available` verifies the slow ship appears as a selectable option.

**PLAYER SHIP SLOW MOVEMENT** *(github.com/akmaier)*
The slow ship shall move horizontally at a slower speed than the regular ship.
*Check:* `tests/integration/test_ship_types.py::test_slow_ship_movement_speed` verifies the slow ship's movement speed is lower than the regular ship's.

**PLAYER SHIP SLOW SPECIAL SHOT** *(github.com/akmaier)*
The slow ship shall fire a special projectile that can destroy up to three aliens in a single shot.
*Check:* `tests/integration/test_ship_types.py::test_slow_ship_special_shot` verifies the slow ship's projectile destroys up to three aliens per shot.

**PLAYER MOVEMENT KEYS** *(github.com/akmaier)*
The player's ship shall be movable horizontally across the bottom of the screen using either the Arrow‑Left/Arrow‑Right keys or the WASD keys (A/D).
*Check:* `tests/unit/test_player_movement.py::test_key_controls` injects Arrow‑Left, Arrow‑Right, A and D keydown events and verifies that the ship's x‑position changes accordingly and remains within screen bounds.

**PLAYER FIRE SPACEBAR** *(github.com/akmaier)*
Pressing the Spacebar shall cause the player's ship to fire a projectile upward.
*Check:* `tests/unit/test_player_fire.py::test_spacebar_fires` injects a Spacebar keydown event and confirms that a bullet entity is created and moves upward from the ship's position.

**PROJECTILE TRAVEL** *(github.com/akmaier)*
Player projectiles shall travel upward at a constant speed.
*Check:* `tests/unit/test_projectile.py::test_upward_speed` runs a simulation where a projectile is created and verifies its y‑position decreases each frame at a constant rate.

**PROJECTILE REMOVAL** *(github.com/akmaier)*
Projectiles shall be removed when they exit the top of the viewport or collide with an alien.
*Check:* `tests/unit/test_projectile.py::test_removal_conditions` ensures that a projectile entity is deleted on exiting the canvas or on collision with an alien.

**ALIEN DESTRUCTION** *(github.com/akmaier)*
When a projectile collides with an alien, the alien shall be removed from the game area.
*Check:* `tests/unit/test_collision.py::test_alien_removal` unit‑tests the collision handler to ensure the alien entity is deleted.

**SCORE INCREMENT** *(github.com/akmaier)*
When a projectile collides with an alien, the player's score shall increase by one point.
*Check:* `tests/unit/test_collision.py::test_score_increment` unit‑tests that the score counter increments by exactly one on alien destruction.

**GAME OVER CONDITION** *(github.com/akmaier)*
The game shall end when any alien reaches the bottom of the screen or collides with the player's ship.
*Check:* `tests/integration/test_game_over.py::test_game_over_conditions` simulates an alien reaching the lower boundary or colliding with the ship and verifies that the game switches to a Game‑Over state and stops spawning new entities.

**GAME END ALL ALIENS DESTROYED** *(github.com/akmaier)*
The game shall end when every alien has been destroyed.
*Check:* `tests/integration/test_game_over.py::test_game_ends_when_all_aliens_destroyed` destroys every alien of the formation and verifies that the game switches to the Game‑Over state.

**SCORE DISPLAY** *(github.com/akmaier)*
The current score shall be displayed prominently on the screen during gameplay.
*Check:* `tests/unit/test_ui.py::test_score_display` inspects the DOM during play and verifies that a visible element shows the numeric score and updates after each alien destruction.

**KISS NO EXTRA FEATURES** *(github.com/akmaier)*
The codebase shall contain no feature beyond the core gameplay described above (e.g., power‑ups, multiple levels, sound effects) unless a future requirement explicitly adds it.
*Check:* `tests/review/code_review.md` static review of source files confirms the absence of symbols or assets implementing non‑core features.

**YAGNI NO UNNECESSARY ABSTRACTION** *(github.com/akmaier)*
No architectural abstraction (extra modules, classes, or inheritance hierarchies) shall be introduced unless required to satisfy an existing requirement.
*Check:* `tests/review/architecture_review.md` code review ensures each module provides a directly required capability and that no unused classes or functions exist.

**SESSION HIGHSCORE DATA** *(github.com/akmaier)*
The session highscore list shall store for each entry the player's score, initials (up to three characters), and a timestamp.
*Check:* `tests/integration/test_session_highscore.py::test_highscore_entry_data` verifies that each highscore entry contains score, initials, and timestamp fields.

**SESSION HIGHSCORE LIMIT** *(github.com/akmaier)*
The session highscore list shall keep at most ten entries, sorted by score descending.
*Check:* `tests/integration/test_session_highscore.py::test_highscore_limit_and_order` verifies that the list length never exceeds ten and that entries are ordered by score descending.

**SESSION HIGHSCORE DISPLAY GAMEOVER** *(github.com/akmaier)*
The session highscore list shall be displayed on the game-over screen.
*Check:* `tests/integration/test_session_highscore.py::test_highscore_display_gameover` verifies that the list is visible on the game-over screen.

**SESSION HIGHSCORE DISPLAY INGAME** *(github.com/akmaier)*
The session highscore list shall be accessible on demand during gameplay.
*Check:* `tests/integration/test_session_highscore.py::test_highscore_access_ingame` verifies that the list can be opened during play.

**SESSION HIGHSCORE RESET** *(github.com/akmaier)*
The session highscore list shall reset to empty when a new game session starts.
*Check:* `tests/integration/test_session_highscore.py::test_highscore_reset_on_new_session` verifies that starting a new session clears all prior entries.