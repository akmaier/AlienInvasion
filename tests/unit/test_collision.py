# SPEC: ALIEN DESTRUCTION / SCORE INCREMENT
# *Check:* tests/unit/test_collision.py::test_alien_removal
# *Check:* tests/unit/test_collision.py::test_score_increment
# Test level: module
#
# Drives the real game code through Node: a projectile is placed over an alien
# and GameSession.update runs the real CollisionSystem; the alien's removal and
# the score increment are observed on the real GameState.
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
session.update({ ...NOOP, confirm: true }); // enter Playing with the regular ship
session.update({ ...NOOP, fire: true }); // spawn one regular projectile
const projectile = session.projectiles.projectiles[0];
const alien = session.formation.aliens[0];
projectile.x = alien.x + 10;
projectile.y = alien.y;
const scoreBefore = session.score.get();
const aliensBefore = session.formation.aliens.length;
session.update({ ...NOOP, fire: false }); // one frame: collision resolved
process.stdout.write(JSON.stringify({
  ok: true,
  projectilesLeft: session.getState().projectiles.length,
  aliensLeft: session.formation.aliens.length,
  aliensBefore: aliensBefore,
  scoreBefore: scoreBefore,
  scoreAfter: session.score.get(),
}));
"""


class TestCollision(unittest.TestCase):
    def test_alien_removal(self):
        result = run_js(SOURCE)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertEqual(result["projectilesLeft"], 0, "the projectile must be removed on collision")
        self.assertEqual(result["aliensLeft"], result["aliensBefore"] - 1,
                         "the collided alien must be removed from the formation")

    def test_score_increment(self):
        result = run_js(SOURCE)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertEqual(result["scoreAfter"], result["scoreBefore"] + 1,
                         "the score must increase by exactly one on alien destruction")


if __name__ == '__main__':
    unittest.main()
