# SPEC: PLAYER SHIP SELECTION
# *Check:* tests/integration/test_ship_selection.py::test_ship_selection_screen
#
# Drives the real game code through Node: a new session starts in the
# ShipSelection phase offering the available ship types, navigating highlights
# an option, and confirming starts the game with the chosen ship type.
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
const start = session.getState();
let state = session.update({ ...NOOP, right: true }); // highlight the slow ship
state = session.update({ ...NOOP, confirm: true }); // confirm -> Playing
process.stdout.write(JSON.stringify({
  ok: true,
  phaseStart: start.phase,
  options: start.shipSelectionOptions.map((o) => o.type),
  selected: state.selectedShipOption,
  phase: state.phase,
  shipType: session.ship.shipType,
}));
"""


class TestShipSelection(unittest.TestCase):
    def test_ship_selection_screen(self):
        result = run_js(SOURCE)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertEqual(result["phaseStart"], "ShipSelection",
                         "a new session starts with the ship selection screen")
        self.assertEqual(sorted(result["options"]), ["regular", "slow"],
                         "both ship types are offered")
        self.assertEqual(result["selected"], 1, "the player can choose a ship type")
        self.assertEqual(result["phase"], "Playing", "confirming starts the game")
        self.assertEqual(result["shipType"], "slow", "the chosen ship type is active")


if __name__ == '__main__':
    unittest.main()
