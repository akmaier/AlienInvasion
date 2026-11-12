# SPEC: PLAYER FIRE SPACEBAR
# *Check:* tests/unit/test_player_fire.py::test_spacebar_fires
# Test level: module
#
# Drives the real game code through Node: a fake window receives a Spacebar
# keydown event via the real KeyboardHandler, GameSession.update is fed the
# resulting GameCommands, and the created projectile's upward motion is
# observed on the real GameState.
import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def run_js(source):
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", source],
        cwd=ROOT, capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise AssertionError(
            "JavaScript driver exited %d:\n%s\n---\n%s" % (proc.returncode, proc.stderr, source)
        )
    return json.loads(proc.stdout)


SOURCE = r"""
globalThis.window = { addEventListener() {}, removeEventListener() {} };
import { createSession } from './game.js';
import { KeyboardHandler } from './src/input/index.js';
const session = createSession({ screenWidth: 800, screenHeight: 600 });
const input = new KeyboardHandler();
input.connect();
session.update({ left: false, right: false, fire: false, confirm: true, highscoreToggle: false }); // Playing
const shipX = session.ship.x;
const shipY = session.ship.y;
// One Spacebar keydown -> exactly one projectile, created at the ship, moving up.
input.onKeyDown({ code: 'Space' });
let state = session.update(input.getCommands()); // spawn + first upward step in the same frame
const projectiles = state.projectiles;
const startY = projectiles[0].y;
// One more frame without releasing Space: no second projectile, moves up 7 px.
state = session.update(input.getCommands());
const stillOne = session.getState().projectiles.length === 1;
const movedUp = session.getState().projectiles[0].y === startY - 7;
process.stdout.write(JSON.stringify({
  ok: true,
  spawned: projectiles.length === 1,
  atShipX: Math.abs(projectiles[0].x - (shipX + 18)) < 1, // ship.x + width/2 - projectileWidth/2
  aboveShip: startY < shipY, // starts at the ship and moves upward
  type: projectiles[0].type,
  stillOne: stillOne,
  movedUp: movedUp,
}));
"""


class TestPlayerFire(unittest.TestCase):
    def test_spacebar_fires(self):
        result = run_js(SOURCE)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertTrue(result["spawned"], "Spacebar must create a projectile")
        self.assertTrue(result["atShipX"], "projectile starts at the ship's position (ship.x + width/2 - projectileWidth/2 = ship.x + 18)")
        self.assertTrue(result["aboveShip"], "projectile starts at the ship and moves upward")
        self.assertEqual(result["type"], "regular", "default ship fires a regular projectile")
        self.assertTrue(result["stillOne"], "holding Space spawns only one projectile")
        self.assertTrue(result["movedUp"], "projectile moves upward")


if __name__ == '__main__':
    unittest.main()
