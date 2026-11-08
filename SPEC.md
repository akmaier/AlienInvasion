# akmaier/AlienInvasion — Specification

**VERBINDLICH (SPEC)**

This is the single binding document of akmaier/AlienInvasion. A sentence belongs here when its violation would be a defect;
everything else — how something is built, what was measured, what is planned — belongs elsewhere and does not bind.

No section of this file is written by hand. Each change is proposed as an entry of a change queue in
`docs/spec-freigaben/`, shown beside the text it would replace, and written here only after a person has accepted it
by an approval record in `docs/approvals/`.

**Form of a requirement:** a **name** in bold capitals, which is its identifier and never changes, followed by its
**source** in italics in parentheses; on the next line its **rule**, one statement that can be shown to hold or not to
hold; then a line beginning with `*Check:*` that names the test guarding the rule, or says that it is checked only at
review. A rule that states two things is two requirements.

## Requirements

**IMPLEMENTATION_JAVASCRIPT_WEB** *(github.com/akmaier, Create an initial SPEC.md for the AlienInvasion repository with browser JavaScript implementation)*
The system shall be implemented as a client‑side web application using JavaScript runnable in a standard web browser.
*Check:* `tests/integration/test_web_implementation.py::test_client_side_application` verifies that the repository contains an index.html that loads a .js file and that opening index.html in a browser displays the game without requiring any server.

**GAMEPLAY_HORIZONTAL_MOVEMENT** *(github.com/akmaier, Atari Space Invaders style gameplay)*
The game shall present rows of alien invaders moving horizontally across the screen.
*Check:* `tests/integration/test_alien_movement.py::test_horizontal_movement` observes that alien rows move left‑to‑right and reverse direction at the screen edges.

**GAMEPLAY_DESCENDING_MOVEMENT** *(github.com/akmaier, Atari Space Invaders style gameplay)*
After reaching a screen edge, alien rows shall descend toward the player's ship.
*Check:* `tests/integration/test_alien_movement.py::test_descend_after_edge` verifies that rows move downward after hitting an edge.

**PLAYER_MOVEMENT_KEYS** *(github.com/akmaier, arrow keys / WASD for movement)*
The player's ship shall be movable horizontally across the bottom of the screen using either the Arrow‑Left/Arrow‑Right keys or the WASD keys (A/D).
*Check:* `tests/unit/test_player_movement.py::test_key_controls` injects Arrow‑Left, Arrow‑Right, A and D keydown events and verifies that the ship's x‑position changes accordingly and remains within screen bounds.

**PLAYER_FIRE_SPACEBAR** *(github.com/akmaier, spacebar to fire)*
Pressing the Spacebar shall cause the player's ship to fire a projectile upward.
*Check:* `tests/unit/test_player_fire.py::test_spacebar_fires` injects a Spacebar keydown event and confirms that a bullet entity is created and moves upward from the ship's position.

**PROJECTILE_TRAVEL** *(github.com/akmaier, spacebar to fire)*
Player projectiles shall travel upward at a constant speed.
*Check:* `tests/unit/test_projectile.py::test_upward_speed` runs a simulation where a projectile is created and verifies its y‑position decreases each frame at a constant rate.

**PROJECTILE_REMOVAL** *(github.com/akmaier, spacebar to fire)*
Projectiles shall be removed when they exit the top of the viewport or collide with an alien.
*Check:* `tests/unit/test_projectile.py::test_removal_conditions` ensures that a projectile entity is deleted on exiting the canvas or on collision with an alien.

**ALIEN_DESTRUCTION** *(github.com/akmaier, Atari Space Invaders style gameplay)*
When a projectile collides with an alien, the alien shall be removed from the game area.
*Check:* `tests/unit/test_collision.py::test_alien_removal` unit‑tests the collision handler to ensure the alien entity is deleted.

**SCORE_INCREMENT** *(github.com/akmaier, Atari Space Invaders style gameplay)*
When a projectile collides with an alien, the player's score shall increase by one point.
*Check:* `tests/unit/test_collision.py::test_score_increment` unit‑tests that the score counter increments by exactly one on alien destruction.

**GAME_OVER_CONDITION** *(github.com/akmaier, Atari Space Invaders style gameplay)*
The game shall end when any alien reaches the bottom of the screen or collides with the player's ship.
*Check:* `tests/integration/test_game_over.py::test_game_over_conditions` simulates an alien reaching the lower boundary or colliding with the ship and verifies that the game switches to a Game‑Over state and stops spawning new entities.

**SCORE_DISPLAY** *(github.com/akmaier, Atari Space Invaders style gameplay)*
The current score shall be displayed prominently on the screen during gameplay.
*Check:* `tests/unit/test_ui.py::test_score_display` inspects the DOM during play and verifies that a visible element shows the numeric score and updates after each alien destruction.

**KISS_NO_EXTRA_FEATURES** *(github.com/akmaier, adhering to KISS and YAGNI principles)*
The codebase shall contain no feature beyond the core gameplay described above (e.g., power‑ups, multiple levels, sound effects) unless a future requirement explicitly adds it.
*Check:* `tests/review/code_review.md` static review of source files confirms the absence of symbols or assets implementing non‑core features.

**YAGNI_NO_UNNECESSARY_ABSTRACTION** *(github.com/akmaier, adhering to KISS and YAGNI principles)*
No architectural abstraction (extra modules, classes, or inheritance hierarchies) shall be introduced unless required to satisfy an existing requirement.
*Check:* `tests/review/architecture_review.md` code review ensures each module provides a directly required capability and that no unused classes or functions exist.
