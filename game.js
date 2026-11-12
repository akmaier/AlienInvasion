/**
 * Alien Invasion - single HTML entry point (ARC-001).
 *
 * Wires the input, game logic and rendering modules into the
 * requestAnimationFrame-driven game loop. Each frame:
 *   1. read input state  (KeyboardHandler -> GameCommands)
 *   2. update game state  (GameSession: movement, collisions, scoring)
 *   3. check game-over conditions (inside GameSession.update)
 *   4. render to canvas (Renderer)
 *   5. update UI (score, overlays inside Renderer.render)
 *
 * No server, no persistence, no build step: plain ES modules run directly
 * in the browser. In Node (tests) the browser start-up is skipped and the
 * exported factories can be driven frame by frame.
 */
import { KeyboardHandler } from './src/input/index.js';
import { GameSession } from './src/game-logic/index.js';
import { Renderer } from './src/rendering/index.js';

const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;

export function createSession({ screenWidth = SCREEN_WIDTH, screenHeight = SCREEN_HEIGHT } = {}) {
  return new GameSession({ screenWidth, screenHeight });
}

export function createRenderer(ctx, dom) {
  return new Renderer(ctx, dom);
}

function start() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dom = {
    score: document.getElementById('score'),
    gameOver: document.getElementById('game-over'),
    highscoreOverlay: document.getElementById('highscore-overlay'),
    initialsPrompt: document.getElementById('initials-prompt'),
    shipSelection: document.getElementById('ship-selection'),
  };
  const input = new KeyboardHandler();
  input.connect();
  const session = createSession({ screenWidth: SCREEN_WIDTH, screenHeight: SCREEN_HEIGHT });
  const renderer = createRenderer(ctx, dom);
  let wasAwaitingInitials = false;

  function frame() {
    // 1. read input state
    const commands = input.getCommands();
    // 2. update game state (includes game-over condition check)
    const state = session.update(commands);
    // 4 + 5. render to canvas and update UI
    renderer.render(state);

    if (state.awaitingInitials && !wasAwaitingInitials) {
      renderer.showInitialsPrompt((initials) => {
        session.submitInitials(initials);
        renderer.hideInitialsPrompt();
      });
    } else if (!state.awaitingInitials) {
      renderer.hideInitialsPrompt();
    }
    wasAwaitingInitials = state.awaitingInitials;

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

start();
