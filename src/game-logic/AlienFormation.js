/**
 * AlienFormation - the grid of alien invaders.
 *
 * Moves as a single unit at constant horizontal speed. When any alien would
 * leave the left or right screen edge, the whole formation reverses direction
 * and descends one step (GAMEPLAY HORIZONTAL MOVEMENT, GAMEPLAY DESCENDING
 * MOVEMENT).
 *
 * Each alien counts the hits it has received; it is removed on the hit that
 * reaches the formation's hitsToDestroy, the number of the wave
 * (ALIEN DESTRUCTION).
 */
export class AlienFormation {
  /**
   * @param {object} props
   * @param {number} props.screenWidth
   * @param {number} props.cols
   * @param {number} props.rows
   * @param {number} props.alienWidth
   * @param {number} props.alienHeight
   * @param {number} props.startX
   * @param {number} props.startY
   * @param {number} props.spacingX
   * @param {number} props.spacingY
   * @param {number} props.speed
   * @param {number} props.descentStep
   * @param {number} [props.hitsToDestroy] - hits that remove an alien (the wave number)
   */
  constructor({
    screenWidth,
    cols,
    rows,
    alienWidth,
    alienHeight,
    startX,
    startY,
    spacingX,
    spacingY,
    speed,
    descentStep,
    hitsToDestroy = 1,
  }) {
    this.screenWidth = screenWidth;
    this.cols = cols;
    this.rows = rows;
    this.alienWidth = alienWidth;
    this.alienHeight = alienHeight;
    this.speed = speed;
    this.descentStep = descentStep;
    this.hitsToDestroy = hitsToDestroy;
    /** @type {1|-1} */
    this.direction = 1;
    /** @type {Array<{x:number,y:number,width:number,height:number,hits?:number}>} */
    this.aliens = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.aliens.push({
          x: startX + c * spacingX,
          y: startY + r * spacingY,
          width: alienWidth,
          height: alienHeight,
        });
      }
    }
  }

  /** Advances the formation one frame. */
  step() {
    const dx = this.speed * this.direction;
    const hitsEdge = this.aliens.some((a) => {
      const nx = a.x + dx;
      return nx < 0 || nx + this.alienWidth > this.screenWidth;
    });
    if (hitsEdge) {
      this.direction = -this.direction;
      for (const a of this.aliens) {
        a.y += this.descentStep;
      }
      return;
    }
    for (const a of this.aliens) {
      a.x += dx;
    }
  }

  /**
   * Gives the alien one hit and removes it from the formation when the hit
   * reaches hitsToDestroy.
   * @param {object} alien - an alien of this formation
   * @returns {boolean} true if this hit removed the alien; false if it stays
   *   or is no longer in the formation
   */
  hit(alien) {
    const index = this.aliens.indexOf(alien);
    if (index < 0) return false;
    alien.hits = (alien.hits || 0) + 1;
    if (alien.hits < this.hitsToDestroy) return false;
    this.aliens.splice(index, 1);
    return true;
  }

  /** @returns {boolean} true when every alien has been removed */
  isEmpty() {
    return this.aliens.length === 0;
  }

  /** @returns {Array<{x:number,y:number,width:number,height:number}>} a copy of the alien positions */
  getPositions() {
    return this.aliens.map((a) => ({ x: a.x, y: a.y, width: a.width, height: a.height }));
  }
}
