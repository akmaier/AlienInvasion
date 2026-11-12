/**
 * AlienFormation - the grid of alien invaders.
 *
 * Moves as a single unit at constant horizontal speed. When any alien would
 * leave the left or right screen edge, the whole formation reverses direction
 * and descends one step (GAMEPLAY HORIZONTAL MOVEMENT, GAMEPLAY DESCENDING
 * MOVEMENT).
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
  }) {
    this.screenWidth = screenWidth;
    this.cols = cols;
    this.rows = rows;
    this.alienWidth = alienWidth;
    this.alienHeight = alienHeight;
    this.speed = speed;
    this.descentStep = descentStep;
    /** @type {1|-1} */
    this.direction = 1;
    /** @type {Array<{x:number,y:number,width:number,height:number}>} */
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

  /** @returns {Array<{x:number,y:number,width:number,height:number}>} a copy of the alien positions */
  getPositions() {
    return this.aliens.map((a) => ({ x: a.x, y: a.y, width: a.width, height: a.height }));
  }
}
