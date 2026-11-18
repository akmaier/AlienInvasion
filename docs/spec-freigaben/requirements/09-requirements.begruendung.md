# Requirements: ships drawn as pixel-art figures

**The change.** Added PLAYER SHIP REGULAR PIXEL SHAPE and PLAYER SHIP SLOW PIXEL SHAPE; the rest of the section is as it stands.

**Why.** akmaier wrote by mail (issue #21, "Alien Invasion", 18 Nov 2026): "Now I want the ship to look like a pixel Claude Pet and the slow ship as a pixel deep seek." Each ship is drawn today as one filled rectangle in the colour of its type: `CanvasRenderer.drawShip` (src/rendering/CanvasRenderer.js) calls `ctx.fillRect(x, ctx.canvas.height - height - 10, width, height)` once. No requirement says how a ship looks, so the request changes behaviour the SPEC does not yet name, and the code can follow only once a requirement states it.
- "the ship" is read as the regular ship, since the same sentence names the slow ship separately.
- "pixel" is a figure made of equal square pixels that leaves part of the bounding box empty, stated as ALIEN PIXEL SHAPE states it, so the same kind of check verifies it in the canvas calls.
- "Claude Pet" is kept in the person's words. It is read as Claude Code's pixel mascot (Clawd); several pixel companions for Claude Code carry the name "Claude Pet", and the reviewer decides which one the figure has to show.
- "deep seek" is read as DeepSeek's mark, a blue whale, and the rule names the whale because that is what a figure of DeepSeek can show.
- That a figure shows the Claude pet or the DeepSeek whale cannot be shown by a test. The checks therefore leave it to review.
- Each figure stays inside its ship's bounding box, so collisions with the ship, which are computed on bounding boxes, keep their behaviour. One requirement per ship type, since a rule that states two things is two requirements.

**Impact list.**
- PLAYER SHIP TYPE REGULAR, PLAYER SHIP TYPE SLOW, PLAYER SHIP SLOW MOVEMENT, PLAYER SHIP SLOW SPECIAL SHOT, PLAYER MOVEMENT KEYS, GAME OVER CONDITION: unchanged. They concern which ships exist, how they move and fire, and the ship's bounding box, not its look.
- PLAYER SHIP SELECTION: unchanged. The selection screen lists the ship types as text; this entry concerns the ship drawn on the canvas.
- ALIEN PIXEL SHAPE: unchanged.
- KISS NO EXTRA FEATURES: unchanged. This entry adds the ships' look explicitly by requirements, which that rule's "unless a future requirement explicitly adds it" allows.
- YAGNI NO UNNECESSARY ABSTRACTION: unchanged. The figures can be drawn inside the existing `drawShip` without a new module or class.
- ARC-002 decides on procedural graphics drawn with `fillRect`, without image assets; a pixel figure drawn that way fits it. Its draw order still describes the ship as "rectangle/triangle at bottom center", which a later edit of ARC-002 may bring in line.
- MOD-rendering names in `realises` the requirements it realises. It will have to name both requirements once this entry is accepted, and `CanvasRenderer.drawShip` (src/rendering/CanvasRenderer.js) will change. The new test `tests/component/test_ship_pixel_shape.js` exercises MOD-rendering.

**Origin.** Source github.com/akmaier. Asked by akmaier by mail, recorded as issue #21 of akmaier/AlienInvasion; proposed for akmaier's acceptance.
