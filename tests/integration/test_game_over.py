# SPEC: GAME OVER CONDITION / GAME END ALL ALIENS DESTROYED
# *Check:* tests/integration/test_game_over.py::test_game_over_conditions
# *Check:* tests/integration/test_game_over.py::test_game_ends_when_all_aliens_destroyed
# Test level: system
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

SOURCE_ALL_DESTROYED = r"""
import { createSession } from './game.js';
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
const session = createSession({ screenWidth: 800, screenHeight: 600 });
session.update({ ...NOOP, confirm: true }); // select the regular ship -> Playing
session.formation.speed = 0; // keep the formation in place
// Destroy every alien, one regular projectile per alien. After the last one
// the game must end (GAME END ALL ALIENS DESTROYED).
while (session.phase === 'Playing' && session.formation.aliens.length > 0) {
  const alien = session.formation.aliens[0];
  session.update({ ...NOOP, fire: true }); // spawn one projectile (edge-detected)
  const projectile = session.projectiles.projectiles[0];
  projectile.x = alien.x + 10;
  projectile.y = alien.y; // place it over the alien
  session.update({ ...NOOP, fire: false }); // step: the projectile hits and destroys the alien
}
const state = session.getState();
process.stdout.write(JSON.stringify({
  ok: true,
  phase: state.phase,
  awaitingInitials: state.awaitingInitials,
  aliensLeft: session.formation.aliens.length,
  projectilesLeft: session.getState().projectiles.length,
  score: state.score,
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

    def test_game_ends_when_all_aliens_destroyed(self):
        result = run_js(SOURCE_ALL_DESTROYED)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertEqual(result["phase"], "GameOver",
                         "destroying every alien must end the game")
        self.assertTrue(result["awaitingInitials"],
                        "the game must await initials after all aliens are destroyed")
        self.assertEqual(result["aliensLeft"], 0, "no aliens must be left")
        self.assertEqual(result["projectilesLeft"], 0, "the last projectile must be spent")
        self.assertEqual(result["score"], 24, "one point per destroyed alien")


if __name__ == '__main__':
    unittest.main()
