/**
 * Ship - the player's ship.
 *
 * Holds position, screen bounds clamping and ship-type-specific movement speed.
 * Ship type is set once at selection time (regular or slow) and never changes
 * during a game.
 */
const SHIP_TYPES = Object.freeze({
  regular: Object.freeze({
    label: 'Regular ship',
    movementSpeed: 6,
    projectileType: 'regular',
    description: 'Standard speed, standard projectile.',
  }),
  slow: Object.freeze({
    label: 'Slow ship',
    movementSpeed: 3,
    projectileType: 'special',
    description: 'Slower horizontal movement; special projectile destroys up to three aliens per shot.',
  }),
});

const SHIP_WIDTH = 40;
const SHIP_HEIGHT = 30;

export class Ship {
  /**
   * @param {object} [props]
   * @param {number} [props.x]
   * @param {number} [props.y]
   * @param {number} [props.width]
   * @param {number} [props.height]
   * @param {'regular'|'slow'} [props.shipType]
   */
  constructor({ x = 0, y = 0, width = SHIP_WIDTH, height = SHIP_HEIGHT, shipType = 'regular' } = {}) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.shipType = shipType;
    this.movementSpeed = SHIP_TYPES[shipType].movementSpeed;
  }

  /**
   * Moves horizontally while the corresponding key is held. Left and right held
   * together cancel (inputs cancel). Position is clamped to the screen bounds.
   * @param {boolean} left
   * @param {boolean} right
   * @param {number} screenWidth
   */
  move(left, right, screenWidth) {
    if (left && right) return;
    let nx = this.x;
    if (left) nx -= this.movementSpeed;
    if (right) nx += this.movementSpeed;
    this.x = Math.min(Math.max(nx, 0), screenWidth - this.width);
  }

  /** @returns {{x:number,width:number,height:number}}} */
  getPosition() {
    return { x: this.x, width: this.width, height: this.height };
  }

  getShipType() {
    return this.shipType;
  }

  getMovementSpeed() {
    return this.movementSpeed;
  }
}
