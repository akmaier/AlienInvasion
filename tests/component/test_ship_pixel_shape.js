// Component test: each ship type is drawn as a pixel-art figure, not as a box.
// Module under test: MOD-rendering (src/rendering, CanvasRenderer.drawShip).
// Test level: component
// Requirements guarded:
//   PLAYER SHIP REGULAR PIXEL SHAPE
//     *Check:* tests/component/test_ship_pixel_shape.js::draws the regular ship as a pixel figure
//   PLAYER SHIP SLOW PIXEL SHAPE
//     *Check:* tests/component/test_ship_pixel_shape.js::draws the slow ship as a pixel figure
// The ship's bounding box comes from the real GameSession; the canvas is a
// fake that records every fillRect. The rectangles drawn for the ship must lie
// inside its bounding box, be equal squares on one grid, leave at least one
// cell of the box empty, and none may fill the whole box. Whether the figure
// shows the Claude pet or the DeepSeek whale is checked at review.

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

function assertPixelFigure(shipType) {
  const session = createSession({ screenWidth: 800, screenHeight: 600 });
  const { x, y, width, height } = session.ship;
  const box = { x, y, width, height };

  const ctx = recordingContext();
  new CanvasRenderer(ctx).drawShip(box.x, box.width, shipType);

  const pixels = ctx.rects;
  assert.ok(pixels.length > 0, `the ${shipType} ship is drawn`);
  for (const p of pixels) {
    assert.ok(inside(p, box), `pixel (${p.x}, ${p.y}) lies inside the ${shipType} ship's box`);
    assert.ok(!(p.w >= box.width - EPS && p.h >= box.height - EPS),
      `no call fills the whole box of the ${shipType} ship`);
  }

  const size = pixels[0].w;
  for (const p of pixels) {
    assert.equal(p.w, p.h, 'every pixel is a square');
    assert.equal(p.w, size, 'every pixel of the ship has the same size');
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
    `the ${shipType} ship leaves ${boxCells - cells.size} of ${boxCells} cells empty, expected at least one`);
}

describe('PLAYER SHIP REGULAR PIXEL SHAPE', () => {
  it('draws the regular ship as a pixel figure', () => {
    assertPixelFigure('regular');
  });
});

describe('PLAYER SHIP SLOW PIXEL SHAPE', () => {
  it('draws the slow ship as a pixel figure', () => {
    assertPixelFigure('slow');
  });
});
