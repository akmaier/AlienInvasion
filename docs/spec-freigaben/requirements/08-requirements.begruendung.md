# Requirements: aliens drawn as pixel-art figures

**The change.** Added ALIEN PIXEL SHAPE; the rest of the section is as it stands.

**Why.** akmaier wrote in Agent M's prompt bar: "The invaders look like boxes. I want them to have the shape of aliens in pixel from." Every alien is drawn today as one filled rectangle: `CanvasRenderer.drawAliens` (src/rendering/CanvasRenderer.js) calls `ctx.fillRect(p.x, p.y, p.width, p.height)` once per alien. No requirement says how an alien looks, so the request changes behaviour the SPEC does not yet name. EVOLUTION ENTERS THROUGH THE SPECIFICATION and the product's Definition of Done (every new test names a requirement) mean that the code can follow only once a requirement states it.
- "in pixel from" (pixel form) is a figure made of equal square pixels, which the check can verify in the canvas calls.
- "not boxes" is stated as part of the bounding box staying empty, which a single filled rectangle cannot satisfy.
- "the shape of aliens" cannot be shown by a test. The check therefore leaves it to review.
- The figure stays inside the alien's bounding box, so collisions, which are computed on bounding boxes (UC-003, UC-004), keep their behaviour.

**Impact list.**
- KISS NO EXTRA FEATURES: unchanged. This entry adds the alien's look explicitly by a requirement, which that rule's "unless a future requirement explicitly adds it" allows.
- YAGNI NO UNNECESSARY ABSTRACTION: unchanged. The figure can be drawn inside the existing `drawAliens` without a new module or class.
- GAMEPLAY HORIZONTAL MOVEMENT, GAMEPLAY DESCENDING MOVEMENT, ALIEN DESTRUCTION, GAME OVER CONDITION: unchanged. They concern the alien's position and bounding box, not its look.
- ARC-002 (rendering via HTML5 Canvas) already allows "rows of rectangles/sprites" and graphics drawn procedurally with `fillRect`, without image assets. A pixel figure drawn with `fillRect` fits that decision, so ARC-002 is not changed.
- MOD-rendering names in `realises` the requirements it realises. It will have to name ALIEN PIXEL SHAPE once this entry is accepted, and `CanvasRenderer.drawAliens` (src/rendering/CanvasRenderer.js) will change. The new test `tests/component/test_alien_pixel_shape.js` exercises MOD-rendering.

**Origin.** Source github.com/akmaier. Asked by akmaier in a conversation with a coding agent; proposed for akmaier's acceptance.
