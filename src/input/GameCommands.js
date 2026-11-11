/**
 * GameCommands - immutable data structure representing the player's intent
 * for a single frame.
 *
 * The Game Logic Layer calls getCommands() each frame to retrieve the current
 * intent. During ShipSelection, left/right navigate options and confirm
 * selects the highlighted ship type. During Playing, left/right move the ship
 * and fire shoots. This module owns no game state; it only maps input to intent.
 *
 * @typedef {object} GameCommands
 * @property {boolean} left           - ArrowLeft or KeyA held (movement or ship-selection navigation)
 * @property {boolean} right          - ArrowRight or KeyD held (movement or ship-selection navigation)
 * @property {boolean} fire           - true on Space keydown edge (not hold) - fires a projectile in playing state
 * @property {boolean} confirm        - true on Enter/Space keydown edge (not hold) - confirms ship selection
 * @property {boolean} highscoreToggle - true on H keydown edge - toggles the highscore overlay
 */

/**
 * Creates an immutable GameCommands object.
 *
 * @param {object} [props]
 * @param {boolean} [props.left]
 * @param {boolean} [props.right]
 * @param {boolean} [props.fire]
 * @param {boolean} [props.confirm]
 * @param {boolean} [props.highscoreToggle]
 * @returns {GameCommands}
 */
export function createGameCommands({
  left = false,
  right = false,
  fire = false,
  confirm = false,
  highscoreToggle = false,
} = {}) {
  return Object.freeze({
    left: Boolean(left),
    right: Boolean(right),
    fire: Boolean(fire),
    confirm: Boolean(confirm),
    highscoreToggle: Boolean(highscoreToggle),
  });
}
