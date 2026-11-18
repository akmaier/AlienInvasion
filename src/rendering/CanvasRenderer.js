/**
 * CanvasRenderer - draws the game entities to a single HTML5 canvas, back to
 * front each frame: background, aliens, ship, projectiles (ARC-002).
 * Aliens are pixel-art invaders drawn with fillRect, no image assets.
 *
 * Purely presentational: it draws what it is given and keeps no state.
 */
const COLORS = Object.freeze({
  background: '#000000',
  alien: '#7ed321',
  ship: Object.freeze({
    regular: '#1e88e5',
    slow: '#43a047',
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
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.alien;
    const cols = ALIEN_PIXELS[0].length;
    const rows = ALIEN_PIXELS.length;
    for (const p of positions) {
      const size = Math.min(Math.floor(p.width / cols), Math.floor(p.height / rows));
      const left = p.x + Math.floor((p.width - cols * size) / 2);
      const top = p.y + Math.floor((p.height - rows * size) / 2);
      ALIEN_PIXELS.forEach((row, r) => {
        for (let c = 0; c < cols; c++) {
          if (row[c] === 'X') ctx.fillRect(left + c * size, top + r * size, size, size);
        }
      });
    }
  }

  /** Draws the player ship with type-appropriate visuals. */
  drawShip(x, width, shipType) {
    const ctx = this.ctx;
    const height = 30;
    ctx.fillStyle = COLORS.ship[shipType] || COLORS.ship.regular;
    ctx.fillRect(x, ctx.canvas.height - height - 10, width, height);
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
