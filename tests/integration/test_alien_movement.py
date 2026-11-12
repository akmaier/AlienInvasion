# SPEC: GAMEPLAY HORIZONTAL MOVEMENT / GAMEPLAY DESCENDING MOVEMENT
# *Check:* tests/integration/test_alien_movement.py::test_horizontal_movement
# *Check:* tests/integration/test_alien_movement.py::test_descend_after_edge
#
# Drives the real game code through Node: the alien formation is pushed to a
# screen edge, GameSession.update runs the real AlienFormation, and the
# reversal at the edge plus the descent afterwards are observed on the real
# GameState.
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


NOOP = {'left': False, 'right': False, 'fire': False, 'confirm': False, 'highscoreToggle': False}


SOURCE = r"""
import { createSession } from './game.js';
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
const session = createSession({ screenWidth: 800, screenHeight: 600 });
session.update({ ...NOOP, confirm: true }); // enter Playing
session.formation.speed = 5;
session.formation.direction = 1;
for (const a of session.formation.aliens) {
  a.x = 800 - a.width - 1; // right at the right screen edge
}
const before = session.formation.aliens.map((a) => ({ x: a.x, y: a.y }));
session.update({ ...NOOP, fire: false }); // hits the edge: reverses and descends
const reversed = session.getState().aliens;
const edgeX = before[0].x;
let xUnchanged = true;
let descended = true;
for (let i = 0; i < reversed.length; i++) {
  if (reversed[i].x !== edgeX) xUnchanged = false;
  if (reversed[i].y <= before[i].y) descended = false;
}
// Now moves left at full speed.
session.update({ ...NOOP, fire: false });
const movedLeft = session.getState().aliens.every((a, i) => a.x === reversed[i].x - 5);
process.stdout.write(JSON.stringify({
  ok: true,
  directionReversed: session.formation.direction === -1,
  xUnchangedOnReversal: xUnchanged,
  descended: descended,
  movedLeft: movedLeft,
}));
"""


class TestAlienMovement(unittest.TestCase):
    def test_horizontal_movement(self):
        result = run_js(SOURCE)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertTrue(result["directionReversed"], "the formation must reverse direction at the screen edge")
        self.assertTrue(result["xUnchangedOnReversal"], "aliens do not move horizontally on the reversal frame")
        self.assertTrue(result["movedLeft"], "after reversing, the formation moves left")

    def test_descend_after_edge(self):
        result = run_js(SOURCE)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertTrue(result["descended"], "rows must descend toward the ship after hitting an edge")


if __name__ == '__main__':
    unittest.main()
