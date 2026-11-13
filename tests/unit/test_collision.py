# SPEC: ALIEN DESTRUCTION / SCORE INCREMENT
# Modules: MOD-game-logic
# *Check:* tests/unit/test_collision.py::test_alien_removal
# *Check:* tests/unit/test_collision.py::test_score_increment
# Test level: module
#
# Drives the real game code through Node: in waves 1, 2 and 3 a regular
# projectile is placed over one alien, hit after hit, and GameSession.update
# runs the real CollisionSystem. An alien of wave n stays after n - 1 hits and
# is removed on the n-th; only the removing hit adds a point.
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
import { createSession } from './game.js';
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
const session = createSession({ screenWidth: 800, screenHeight: 600 });
session.update({ ...NOOP, confirm: true }); // enter Playing with the regular ship
function shoot(alien) {
  session.formation.speed = 0;
  session.projectiles.spawn(alien.x + 10, alien.y, 'regular');
  session.update(NOOP); // one frame: collision resolved
}
function nextWave() { // leave one alien and hit it until the wave is cleared
  const wave = session.getState().wave;
  session.formation.aliens.splice(1);
  const alien = session.formation.aliens[0];
  for (let i = 0; i < 10 && session.getState().wave === wave; i++) shoot(alien);
}
const waves = [];
for (const n of [1, 2, 3]) {
  for (let k = 0; k < 5 && session.getState().wave !== n; k++) nextWave();
  const alien = session.formation.aliens[0];
  const aliensBefore = session.formation.aliens.length;
  const scoreBefore = session.score.get();
  const hits = [];
  for (let i = 1; i <= n; i++) {
    shoot(alien);
    hits.push({ present: session.formation.aliens.includes(alien),
                aliensLeft: session.formation.aliens.length,
                projectilesLeft: session.getState().projectiles.length,
                scoreGained: session.score.get() - scoreBefore });
  }
  waves.push({ wave: session.getState().wave, n, aliensBefore, hits });
}
process.stdout.write(JSON.stringify({ ok: true, waves }));
"""


class TestCollision(unittest.TestCase):
    def test_alien_removal(self):
        result = run_js(SOURCE)
        self.assertTrue(result["ok"], "driver reported failure")
        for wave in result["waves"]:
            n = wave["n"]
            self.assertEqual(wave["wave"], n, "the driver must be in wave %d" % n)
            for i, hit in enumerate(wave["hits"], start=1):
                self.assertEqual(hit["projectilesLeft"], 0,
                                 "wave %d, hit %d: the projectile must be removed on collision" % (n, i))
                if i < n:
                    self.assertTrue(hit["present"],
                                    "wave %d: the alien must stay after %d hits" % (n, i))
                    self.assertEqual(hit["aliensLeft"], wave["aliensBefore"])
                else:
                    self.assertFalse(hit["present"],
                                     "wave %d: the alien must be removed on hit %d" % (n, n))
                    self.assertEqual(hit["aliensLeft"], wave["aliensBefore"] - 1)

    def test_score_increment(self):
        result = run_js(SOURCE)
        self.assertTrue(result["ok"], "driver reported failure")
        for wave in result["waves"]:
            n = wave["n"]
            for i, hit in enumerate(wave["hits"], start=1):
                expected = 1 if i == n else 0
                self.assertEqual(hit["scoreGained"], expected,
                                 "wave %d, hit %d: the score must rise by one only when the alien is removed"
                                 % (n, i))


if __name__ == '__main__':
    unittest.main()
