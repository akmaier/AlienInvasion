# SPEC: WAVE FIRST / WAVE NEXT
# Modules: MOD-game-logic, MOD-rendering
# *Check:* tests/integration/test_waves.py::test_session_begins_with_wave_one
# *Check:* tests/integration/test_waves.py::test_next_wave_after_formation_destroyed
# Test level: system
#
# Drives the real game code through Node: every game session - on a freshly
# loaded page and after the restart button - begins with wave 1, whose aliens
# fall to a single hit; destroying every alien of a wave starts the next wave
# with a full formation in the start position, without ending the game.
import json
import subprocess
import unittest
from pathlib import Path

from .test_game_over import FAKE_DOM

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


SHOOT = r"""
// One regular projectile placed over the alien; one frame resolves the hit.
function shoot(alien) {
  session.formation.speed = 0;
  session.projectiles.spawn(alien.x + 10, alien.y, 'regular');
  return step({});
}
// Destroys every alien of the current wave, one shot at a time.
function clearWave() {
  const wave = session.getState().wave;
  let shots = 0;
  while (session.phase === 'Playing' && session.getState().wave === wave && shots < 500) {
    shoot(session.formation.aliens[0]);
    shots++;
  }
  return shots;
}
function singleHitRemoves() {
  const alien = session.formation.aliens[0];
  const before = session.formation.aliens.length;
  shoot(alien);
  return !session.formation.aliens.includes(alien) && session.formation.aliens.length === before - 1;
}
"""

SOURCE_FIRST = FAKE_DOM + SHOOT + r"""
const onLoad = session.getState().wave;
step({ confirm: true }); // Playing
const loaded = { wave: session.getState().wave, removedBySingleHit: singleHitRemoves() };
clearWave(); // wave 1 -> wave 2
const reached = session.getState().wave;
endGame();
session.submitInitials('ABC', 1000);
step({});
const clicked = clickRestartButton(dom.gameOver);
step({});
const afterRestart = session.getState().wave;
step({ confirm: true }); // Playing in the new session
const restarted = { wave: session.getState().wave, removedBySingleHit: singleHitRemoves() };
process.stdout.write(JSON.stringify({ ok: true, onLoad, loaded, reached, clicked, afterRestart, restarted }));
"""

SOURCE_NEXT = FAKE_DOM + SHOOT + r"""
step({ confirm: true }); // Playing, wave 1
const start = session.getState().aliens;
const shots = clearWave();
const state = session.getState();
process.stdout.write(JSON.stringify({ ok: true, shots, start,
  phase: state.phase, wave: state.wave, aliens: state.aliens, score: state.score }));
"""


class TestWaves(unittest.TestCase):
    def test_session_begins_with_wave_one(self):
        result = run_js(SOURCE_FIRST)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertEqual(result["onLoad"], 1, "a freshly loaded page is at wave 1")
        self.assertEqual(result["loaded"]["wave"], 1, "the first game session begins with wave 1")
        self.assertTrue(result["loaded"]["removedBySingleHit"],
                        "in wave 1 an alien is removed by a single hit")
        self.assertEqual(result["reached"], 2, "the game must have reached wave 2 before the restart")
        self.assertTrue(result["clicked"], "the game-over screen must hold a restart button")
        self.assertEqual(result["afterRestart"], 1, "the restart button starts a session at wave 1")
        self.assertEqual(result["restarted"]["wave"], 1, "the restarted session plays wave 1")
        self.assertTrue(result["restarted"]["removedBySingleHit"],
                        "after the restart an alien is again removed by a single hit")

    def test_next_wave_after_formation_destroyed(self):
        result = run_js(SOURCE_NEXT)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertEqual(result["shots"], 24, "wave 1 holds 24 aliens, one shot each")
        self.assertEqual(result["phase"], "Playing", "destroying every alien must not end the game")
        self.assertEqual(result["wave"], 2, "wave 2 starts after wave 1 is destroyed")
        self.assertEqual(len(result["aliens"]), 24, "wave 2 starts with a full formation")
        self.assertEqual(result["aliens"], result["start"],
                         "wave 2 starts in the start position of wave 1")
        self.assertEqual(result["score"], 24, "one point per destroyed alien of wave 1")


if __name__ == '__main__':
    unittest.main()
