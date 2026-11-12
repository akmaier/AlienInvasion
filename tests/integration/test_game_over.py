# SPEC: GAME OVER CONDITION
# *Check:* tests/integration/test_game_over.py::test_game_over_conditions
# Test level: system
#
# Drives the real game code through Node: an alien reaching the bottom or
# colliding with the ship switches GameSession to GameOver and stops all
# entity spawning.
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


SOURCE_GROUND = r"""
import { createSession } from './game.js';
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
const session = createSession({ screenWidth: 800, screenHeight: 600 });
session.update({ ...NOOP, right: true, confirm: true }); // Playing
session.formation.speed = 0;
session.formation.aliens[0].y = session.ship.y - session.formation.aliens[0].height; // reaches bottom
const state = session.update({ ...NOOP, fire: false });
process.stdout.write(JSON.stringify({
  ok: true,
  phase: state.phase,
  awaitingInitials: state.awaitingInitials,
  spawnsAfterGameOver: (() => { session.update({ ...NOOP, fire: true }); return session.getState().projectiles.length === 0; })(),
}));
"""

SOURCE_COLLISION = r"""
import { createSession } from './game.js';
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
const session = createSession({ screenWidth: 800, screenHeight: 600 });
session.update({ ...NOOP, right: true, confirm: true }); // Playing
const a = session.formation.aliens[0];
a.x = session.ship.x;
a.y = session.ship.y; // alien collides with the ship
const state = session.update({ ...NOOP, fire: false });
process.stdout.write(JSON.stringify({
  ok: true,
  phase: state.phase,
  awaitingInitials: state.awaitingInitials,
  spawnsAfterGameOver: (() => { session.update({ ...NOOP, fire: true }); return session.getState().projectiles.length === 0; })(),
}));
"""


class TestGameOver(unittest.TestCase):
    def test_game_over_conditions(self):
        for label, source in (("ground", SOURCE_GROUND), ("collision", SOURCE_COLLISION)):
            result = run_js(source)
            self.assertTrue(result["ok"], "driver reported failure for %s" % label)
            self.assertEqual(result["phase"], "GameOver",
                             "%s: the game must switch to GameOver" % label)
            self.assertTrue(result["awaitingInitials"],
                            "%s: the game must await initials" % label)
            self.assertTrue(result["spawnsAfterGameOver"],
                            "%s: the game must stop spawning new entities" % label)


if __name__ == '__main__':
    unittest.main()
