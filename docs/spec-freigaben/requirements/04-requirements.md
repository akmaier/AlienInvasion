## Requirements

**PLAYER SHIP TYPE SELECTION** *(github.com/akmaier)*
At game start, the player shall be able to select between a regular ship and a slow ship.
*Check:* `tests/integration/test_ship_selection.py::test_ship_type_selection` verifies that a selection UI appears at game start offering both ship types.

**SLOW SHIP PIERCING PROJECTILES** *(github.com/akmaier)*
The slow ship's projectiles shall pierce through up to three aliens before being removed.
*Check:* `tests/integration/test_ship_selection.py::test_piercing_projectiles` verifies that the slow ship's projectiles pass through up to three aliens before being removed.

**KISS NO EXTRA FEATURES** *(github.com/akmaier)*
The codebase shall contain no feature beyond the core gameplay described above (e.g., power‑ups, multiple levels, sound effects) unless a future requirement explicitly adds it; the **PLAYER SHIP TYPE SELECTION** and **SLOW SHIP PIERCING PROJECTILES** requirements are such explicit exceptions.
*Check:* `tests/review/code_review.md` static review of source files confirms the absence of symbols or assets implementing non‑core features other than those explicitly permitted by **PLAYER SHIP TYPE SELECTION** and **SLOW SHIP PIERCING PROJECTILES**.