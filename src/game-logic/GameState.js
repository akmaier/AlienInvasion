/**
 * GameState - immutable snapshot of the whole simulation, produced each frame
 * for the Rendering Layer. Holds no behaviour; the rendering module only reads it.
 *
 * @typedef {object} GameState
 * @property {'ShipSelection'|'Playing'|'GameOver'} phase
 * @property {object} ship - {x, y, width, height, shipType, movementSpeed}
 * @property {Array<{x:number,y:number,width:number,height:number}>} aliens
 * @property {Array<{x:number,y:number,width:number,height:number,type:string,aliensDestroyed:number}>} projectiles
 * @property {number} score
 * @property {Array<{score:number,initials:string,timestamp:number}>} highscores
 * @property {boolean} showHighscoreOverlay
 * @property {boolean} awaitingInitials
 * @property {Array<{type:string,label:string,description:string}>} shipSelectionOptions
 * @property {number} selectedShipOption
 */

/**
 * Creates a frozen GameState snapshot.
 * @param {object} props
 * @returns {GameState}
 */
export function createGameState({
  phase,
  ship,
  aliens,
  projectiles,
  score,
  highscores,
  showHighscoreOverlay,
  awaitingInitials,
  shipSelectionOptions,
  selectedShipOption,
}) {
  return Object.freeze({
    phase,
    ship: Object.freeze({ ...ship }),
    aliens: aliens.map((a) => Object.freeze({ ...a })),
    projectiles: projectiles.map((p) => Object.freeze({ ...p })),
    score: Number(score),
    highscores: highscores.map((h) => Object.freeze({ ...h })),
    showHighscoreOverlay: Boolean(showHighscoreOverlay),
    awaitingInitials: Boolean(awaitingInitials),
    shipSelectionOptions: shipSelectionOptions
      ? shipSelectionOptions.map((o) => Object.freeze({ ...o }))
      : [],
    selectedShipOption: selectedShipOption === undefined ? undefined : Number(selectedShipOption),
  });
}
