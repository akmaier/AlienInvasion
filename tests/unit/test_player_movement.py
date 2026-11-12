# SPEC: PLAYER MOVEMENT KEYS
# *Check:* tests/unit/test_player_movement.py::test_key_controls
#
# Drives the real game code (src/game-logic, src/input) through Node: a fake
# window receives Arrow-Left / Arrow-Right / A / D keydown events via the real
# KeyboardHandler, the resulting GameCommands flow into GameSession.update, and
# the ship's x-position is observed on the real GameState.
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
// Enter Playing with the regular ship first.
session.update({ left: false, right: false, fire: false, confirm: true, highscoreToggle: false });
const startX = session.ship.x;
const screenWidth = 800;
const shipWidth = session.ship.width;
const commands = () => input.getCommands();
const down = (code) => input.onKeyDown({ code: code });
const up = (code) => input.onKeyUp({ code: code });
// Arrow-Left held: ship moves left every frame.
down('ArrowLeft');
session.update(commands());
const afterLeft = session.ship.x;
session.update(commands());
const afterLeft2 = session.ship.x;
// Held left keeps moving until clamped at the left screen edge.
for (let i = 0; i < 1000; i++) { session.update(commands()); }
const atLeftEdge = session.ship.x;
// Release left, hold D (right): moves right and clamps at the right edge.
up('ArrowLeft');
down('KeyD');
for (let i = 0; i < 1000; i++) { session.update(commands()); }
const atRightEdge = session.ship.x;
// A moves left as well.
up('KeyD');
down('KeyA');
const beforeA = session.ship.x;
session.update(commands());
const afterA = session.ship.x;
process.stdout.write(JSON.stringify({
  ok: true,
  movedLeft: afterLeft < startX && afterLeft2 < afterLeft,
  atLeftEdge: atLeftEdge,
  atRightEdge: atRightEdge,
  rightEdge: screenWidth - shipWidth,
  aMovesLeft: afterA < beforeA,
}));
"""


class TestPlayerMovement(unittest.TestCase):
    def test_key_controls(self):
        result = run_js(SOURCE)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertTrue(result["movedLeft"], "Arrow-Left must move the ship left")
        self.assertEqual(result["atLeftEdge"], 0, "ship must clamp at the left edge")
        self.assertEqual(result["atRightEdge"], result["rightEdge"], "ship must clamp at the right edge")
        self.assertTrue(result["aMovesLeft"], "A must move the ship left like Arrow-Left")


if __name__ == '__main__':
    unittest.main()
