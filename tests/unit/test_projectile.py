# SPEC: PROJECTILE TRAVEL / PROJECTILE REMOVAL
# *Check:* tests/unit/test_projectile.py::test_upward_speed
# *Check:* tests/unit/test_projectile.py::test_removal_conditions
# Test level: module
#
# Drives the real game code through Node: projectiles are spawned via
# GameSession.update and their positions are observed on the real GameState
# frame by frame.
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


SOURCE_SPEED = r"""
import { createSession } from './game.js';
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
const session = createSession({ screenWidth: 800, screenHeight: 600 });
session.update({ ...NOOP, confirm: true }); // enter Playing with the regular ship
session.update({ ...NOOP, fire: true }); // spawn one projectile
const startY = session.getState().projectiles[0].y;
const speed = session.projectiles.speed;
const ys = [startY];
for (let i = 0; i < 5; i++) {
  session.update({ ...NOOP, fire: false });
  ys.push(session.getState().projectiles[0].y);
}
const diffs = [];
for (let i = 0; i < ys.length - 1; i++) { diffs.push(ys[i] - ys[i + 1]); }
process.stdout.write(JSON.stringify({ ok: true, speed: speed, diffs: diffs, startY: startY, endY: ys[ys.length - 1] }));
"""

SOURCE_REMOVAL = r"""
import { createSession } from './game.js';
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
const session = createSession({ screenWidth: 800, screenHeight: 600 });
session.update({ ...NOOP, confirm: true }); // enter Playing with the regular ship
session.update({ ...NOOP, fire: true });
const projectile = session.projectiles.projectiles[0];
// 1) leaves the top of the viewport -> removed
projectile.y = -1;
session.update({ ...NOOP, fire: false });
const exited = session.getState().projectiles.length === 0;
// 2) collides with an alien -> removed (and the alien is removed)
session.update({ ...NOOP, fire: true });
const p2 = session.projectiles.projectiles[0];
const alien = session.formation.aliens[0];
p2.x = alien.x + 10;
p2.y = alien.y;
const before = session.formation.aliens.length;
session.update({ ...NOOP, fire: false });
const collided = session.getState().projectiles.length === 0;
const alienGone = session.formation.aliens.length === before - 1;
process.stdout.write(JSON.stringify({ ok: true, exited: exited, collided: collided, alienGone: alienGone, aliensBefore: before, aliensAfter: session.formation.aliens.length }));
"""


class TestProjectile(unittest.TestCase):
    def test_upward_speed(self):
        result = run_js(SOURCE_SPEED)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertEqual(result["speed"], 7, "projectiles travel at constant speed 7")
        self.assertTrue(all(d == 7 for d in result["diffs"]),
                        "y-position decreases by exactly 7 each frame: %r" % (result["diffs"],))
        self.assertEqual(result["endY"], result["startY"] - 5 * 7, "five frames at speed 7")

    def test_removal_conditions(self):
        result = run_js(SOURCE_REMOVAL)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertTrue(result["exited"], "projectile must be removed when it exits the top")
        self.assertTrue(result["collided"], "projectile must be removed on collision with an alien")
        self.assertTrue(result["alienGone"], "the collided alien must be removed")


if __name__ == '__main__':
    unittest.main()
