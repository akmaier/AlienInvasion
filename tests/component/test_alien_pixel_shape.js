// Component test: aliens are drawn as pixel-art figures, not as boxes.
// Module under test: MOD-rendering (src/rendering, CanvasRenderer.drawAliens).
// Test level: component
// Requirement guarded: ALIEN PIXEL SHAPE
//   *Check:* tests/component/test_alien_pixel_shape.js::draws every alien as a pixel figure
// The formation comes from the real GameSession; the canvas is a fake that
// records every fillRect. For each alien, the rectangles drawn inside its
// bounding box must be equal squares, must leave at least one cell of the box
// empty, and none may fill the whole box. Whether the figure looks like an
// alien is checked at review.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../../game.js';
import { CanvasRenderer } from '../../src/rendering/index.js';

function recordingContext() {
  const rects = [];
  return {
    canvas: { width: 800, height: 600 },
    fillStyle: null,
    rects,
    fillRect(x, y, w, h) { rects.push({ x, y, w, h }); },
    clearRect() {},
  };
}

const EPS = 1e-9;

function inside(r, box) {
  return r.x >= box.x - EPS && r.y >= box.y - EPS
    && r.x + r.w <= box.x + box.width + EPS && r.y + r.h <= box.y + box.height + EPS;
}

describe('ALIEN PIXEL SHAPE', () => {
  it('draws every alien as a pixel figure', () => {
    const session = createSession({ screenWidth: 800, screenHeight: 600 });
    const aliens = session.formation.getPositions();
    assert.ok(aliens.length > 0, 'the formation holds aliens');

    const ctx = recordingContext();
    new CanvasRenderer(ctx).drawAliens(aliens);

    for (const box of aliens) {
      const pixels = ctx.rects.filter((r) => inside(r, box));
      assert.ok(pixels.length > 0, `alien at (${box.x}, ${box.y}) is drawn inside its box`);

      for (const p of pixels) {
        assert.ok(!(p.w >= box.width - EPS && p.h >= box.height - EPS),
          `no call fills the whole box of the alien at (${box.x}, ${box.y})`);
      }

      const size = pixels[0].w;
      for (const p of pixels) {
        assert.equal(p.w, p.h, 'every pixel is a square');
        assert.equal(p.w, size, 'every pixel of one alien has the same size');
      }

      const minX = Math.min(...pixels.map((p) => p.x));
      const minY = Math.min(...pixels.map((p) => p.y));
      const cells = new Set();
      for (const p of pixels) {
        const cx = (p.x - minX) / size;
        const cy = (p.y - minY) / size;
        assert.ok(Math.abs(cx - Math.round(cx)) < 1e-6 && Math.abs(cy - Math.round(cy)) < 1e-6,
          'pixels lie on one grid');
        cells.add(`${Math.round(cx)},${Math.round(cy)}`);
      }
      const boxCells = Math.floor(box.width / size + EPS) * Math.floor(box.height / size + EPS);
      assert.ok(cells.size < boxCells,
        `alien at (${box.x}, ${box.y}) leaves ${boxCells - cells.size} of ${boxCells} cells empty, expected at least one`);
    }

    const outside = ctx.rects.filter((r) => !aliens.some((box) => inside(r, box)));
    assert.equal(outside.length, 0, 'every alien pixel lies inside an alien box');
  });
});
