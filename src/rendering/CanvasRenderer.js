/**
 * CanvasRenderer - draws the game entities to a single HTML5 canvas, back to
 * front each frame: background, aliens, ship, projectiles (ARC-002).
 * Aliens and ships are pixel-art figures drawn with fillRect, no image assets.
 *
 * Purely presentational: it draws what it is given and keeps no state.
 */
const COLORS = Object.freeze({
  background: '#000000',
  alien: '#7ed321',
  ship: Object.freeze({
    regular: '#d97757',
    slow: '#4d6bfe',
  }),
  projectile: '#ffffff',
});

/** Pixel-art invader, one string per row, 'X' a filled pixel (ALIEN PIXEL SHAPE). */
const ALIEN_PIXELS = Object.freeze([
  '..X.....X..',
  '...X...X...',
  '..XXXXXXX..',
  '.XX.XXX.XX.',
  'XXXXXXXXXXX',
  'X.XXXXXXX.X',
  'X.X.....X.X',
  '...XX.XX...',
]);

/** Pixel-art Claude pet for the regular ship (PLAYER SHIP REGULAR PIXEL SHAPE). */
const CLAUDE_PET_PIXELS = Object.freeze([
  '..XXXXXXXXX..',
  '..XXXXXXXXX..',
  '..XX.XXX.XX..',
  '..XX.XXX.XX..',
  'XXXXXXXXXXXXX',
  'XXXXXXXXXXXXX',
  '..XXXXXXXXX..',
  '..XXXXXXXXX..',
  '..X.X...X.X..',
  '..X.X...X.X..',
]);

/** Pixel-art DeepSeek whale for the slow ship (PLAYER SHIP SLOW PIXEL SHAPE). */
const DEEPSEEK_WHALE_PIXELS = Object.freeze([
  '..........X.X',
  '..........XX.',
  '...XXXXX..X..',
  '.XXXXXXXXXX..',
  'XX.XXXXXXXX..',
  'XXXXXXXXXXX..',
  'XXXXXXXXXXX..',
  '.XXXXXXXXX...',
  '..XXXXXXX....',
  '....XXX......',
]);

const SHIP_PIXELS = Object.freeze({
  regular: CLAUDE_PET_PIXELS,
  slow: DEEPSEEK_WHALE_PIXELS,
});

export class CanvasRenderer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  /** Clears the entire canvas. */
  clear() {
    const { width, height } = this.ctx.canvas;
    this.ctx.clearRect(0, 0, width, height);
  }

  /** Paints the background. */
  drawBackground() {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  /** Draws the alien formation, each alien as a pixel-art invader centred
   *  in its bounding box. */
  drawAliens(positions) {
    this.ctx.fillStyle = COLORS.alien;
    for (const p of positions) this.drawPixelFigure(ALIEN_PIXELS, p);
  }

  /** Draws the player ship as the pixel-art figure of its type, centred in
   *  its bounding box. */
  drawShip(x, width, shipType) {
    const height = 30;
    const box = { x, y: this.ctx.canvas.height - height - 10, width, height };
    this.ctx.fillStyle = COLORS.ship[shipType] || COLORS.ship.regular;
    this.drawPixelFigure(SHIP_PIXELS[shipType] || SHIP_PIXELS.regular, box);
  }

  /** Fills the 'X' cells of a pixel figure as equal squares, as large as
   *  fit, centred in the box. */
  drawPixelFigure(pixels, box) {
    const cols = pixels[0].length;
    const rows = pixels.length;
    const size = Math.min(Math.floor(box.width / cols), Math.floor(box.height / rows));
    const left = box.x + Math.floor((box.width - cols * size) / 2);
    const top = box.y + Math.floor((box.height - rows * size) / 2);
    pixels.forEach((row, r) => {
      for (let c = 0; c < cols; c++) {
        if (row[c] === 'X') this.ctx.fillRect(left + c * size, top + r * size, size, size);
      }
    });
  }

  /** Draws the active projectiles. */
  drawProjectiles(positions) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.projectile;
    for (const p of positions) {
      ctx.fillRect(p.x, p.y, p.width, p.height);
    }
  }
}
