# SPEC: PLAYER SHIP TYPE REGULAR / PLAYER SHIP TYPE SLOW /
#       PLAYER SHIP SLOW MOVEMENT / PLAYER SHIP SLOW SPECIAL SHOT
# *Check:* tests/integration/test_ship_types.py::test_regular_ship_available
# *Check:* tests/integration/test_ship_types.py::test_slow_ship_available
# *Check:* tests/integration/test_ship_types.py::test_slow_ship_movement_speed
# *Check:* tests/integration/test_ship_types.py::test_slow_ship_special_shot
# Test level: system
#
# Drives the real game code through Node: ship selection offers regular and
# slow, the slow ship moves slower, and its special projectile destroys up to
# three aliens in a single shot.
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


SOURCE_TYPES = r"""
import { createSession } from './game.js';
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
const session = createSession({ screenWidth: 800, screenHeight: 600 });
const types = session.getState().shipSelectionOptions.map((o) => o.type);
process.stdout.write(JSON.stringify({ ok: true, types: types }));
"""

SOURCE_SPEED = r"""
import { createSession } from './game.js';
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
const session = createSession({ screenWidth: 800, screenHeight: 600 });
session.update({ ...NOOP, right: true, confirm: true }); // select slow ship -> Playing
const slowSpeed = session.ship.movementSpeed;
const regular = createSession({ screenWidth: 800, screenHeight: 600 });
regular.update({ ...NOOP, confirm: true }); // regular ship -> Playing
const regularSpeed = regular.ship.movementSpeed;
process.stdout.write(JSON.stringify({ ok: true, slowSpeed: slowSpeed, regularSpeed: regularSpeed }));
"""

SOURCE_SHOT = r"""
import { createSession } from './game.js';
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
const session = createSession({ screenWidth: 800, screenHeight: 600 });
session.update({ ...NOOP, right: true, confirm: true }); // slow ship -> Playing
session.formation.speed = 0;
const alien = session.formation.aliens[0];
session.update({ ...NOOP, fire: true }); // special projectile
const projectile = session.projectiles.projectiles[0];
const projectileType = projectile.type;
projectile.x = alien.x + 10;
projectile.y = alien.y;
session.formation.aliens.push({ x: alien.x, y: alien.y, width: 40, height: 30 });
session.formation.aliens.push({ x: alien.x, y: alien.y, width: 40, height: 30 });
const scoreBefore = session.score.get();
const aliensBefore = session.formation.aliens.length;
session.update({ ...NOOP, fire: false }); // one shot hits all three overlapping aliens
process.stdout.write(JSON.stringify({
  ok: true,
  projectileType: projectileType,
  scoreGained: session.score.get() - scoreBefore,
  projectilesLeft: session.getState().projectiles.length,
  aliensDestroyed: aliensBefore - session.formation.aliens.length,
}));
"""


class TestShipTypes(unittest.TestCase):
    def test_regular_ship_available(self):
        result = run_js(SOURCE_TYPES)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertIn("regular", result["types"], "the regular ship is a selectable option")

    def test_slow_ship_available(self):
        result = run_js(SOURCE_TYPES)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertIn("slow", result["types"], "the slow ship is a selectable option")

    def test_slow_ship_movement_speed(self):
        result = run_js(SOURCE_SPEED)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertEqual(result["slowSpeed"], 3, "the slow ship moves at speed 3")
        self.assertEqual(result["regularSpeed"], 6, "the regular ship moves at speed 6")
        self.assertLess(result["slowSpeed"], result["regularSpeed"],
                        "the slow ship moves slower than the regular ship")

    def test_slow_ship_special_shot(self):
        result = run_js(SOURCE_SHOT)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertEqual(result["projectileType"], "special", "the slow ship fires a special projectile")
        self.assertEqual(result["scoreGained"], 3,
                         "the special shot destroys up to three aliens: gained %d points" % result["scoreGained"])
        self.assertEqual(result["projectilesLeft"], 0,
                         "the special projectile is spent after its third hit")
        self.assertEqual(result["aliensDestroyed"], 3)


if __name__ == '__main__':
    unittest.main()
