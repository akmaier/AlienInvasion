/**
 * ProjectileManager - spawns, moves and removes player projectiles.
 *
 * All projectiles travel upward at constant speed. A projectile carries a type
 * ('regular' or 'special'); special projectiles (slow ship) count the aliens
 * they destroyed and are removed after the third hit (ARC-006).
 */
export class ProjectileManager {
  /**
   * @param {object} [props]
   * @param {number} [props.speed]
   * @param {number} [props.width]
   * @param {number} [props.height]
   */
  constructor({ speed = 7, width = 4, height = 10 } = {}) {
    this.speed = speed;
    this.width = width;
    this.height = height;
    /** @type {Array<{x:number,y:number,width:number,height:number,speed:number,type:'regular'|'special',aliensDestroyed:number}>} */
    this.projectiles = [];
  }

  /**
   * Spawns one projectile at (x, y). Ship type 'slow' creates a special
   * projectile, any other type a regular one.
   * @param {number} x
   * @param {number} y
   * @param {string} shipType
   */
  spawn(x, y, shipType) {
    this.projectiles.push({
      x,
      y,
      width: this.width,
      height: this.height,
      speed: this.speed,
      type: shipType === 'slow' ? 'special' : 'regular',
      aliensDestroyed: 0,
    });
  }

  /** Moves all projectiles upward and removes those that exited the top. */
  step() {
    for (const p of this.projectiles) {
      p.y -= this.speed;
    }
    this.projectiles = this.projectiles.filter((p) => p.y >= 0);
  }

  /** @returns {Array} a copy of the active projectiles */
  getPositions() {
    return this.projectiles.map((p) => ({
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
      type: p.type,
      aliensDestroyed: p.aliensDestroyed,
    }));
  }
}
