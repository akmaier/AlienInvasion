/**
 * CanvasRenderer - draws the game entities to a single HTML5 canvas, back to
 * front each frame: background, aliens, ship, projectiles (ARC-002).
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

  /** Draws the alien formation. */
  drawAliens(positions) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.alien;
    for (const p of positions) {
      ctx.fillRect(p.x, p.y, p.width, p.height);
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
