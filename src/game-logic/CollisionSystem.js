/**
 * CollisionSystem - bounding-box collision checks.
 *
 * Pure functions: projectile vs. aliens, alien vs. ship, aliens vs. ground
 * (the ship's line). The game session decides what a collision does.
 */
export class CollisionSystem {
  /**
   * @param {object} a - {x,y,width,height}
   * @param {object} b - {x,y,width,height}
   * @returns {boolean}
   */
  static overlaps(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  /**
   * @param {Array<{x:number,y:number,width:number,height:number}>} projectiles
   * @param {Array<{x:number,y:number,width:number,height:number}>} aliens
   * @returns {Array<{projectileIndex:number,alienIndex:number}>}
   */
  static checkProjectileAlien(projectiles, aliens) {
    const collisions = [];
    for (let pi = 0; pi < projectiles.length; pi++) {
      for (let ai = 0; ai < aliens.length; ai++) {
        if (this.overlaps(projectiles[pi], aliens[ai])) {
          collisions.push({ projectileIndex: pi, alienIndex: ai });
        }
      }
    }
    return collisions;
  }

  /**
   * @param {Array<{x:number,y:number,width:number,height:number}>} aliens
   * @param {object} ship - {x,y,width,height}
   * @returns {boolean}
   */
  static checkAlienShip(aliens, ship) {
    return aliens.some((a) => this.overlaps(a, ship));
  }

  /**
   * @param {Array<{x:number,y:number,width:number,height:number}>} aliens
   * @param {number} groundY
   * @returns {boolean} true if any alien has reached the ground line
   */
  static checkAlienGround(aliens, groundY) {
    return aliens.some((a) => a.y + a.height >= groundY);
  }
}
