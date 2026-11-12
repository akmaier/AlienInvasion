# SPEC: SCORE DISPLAY
# *Check:* tests/unit/test_ui.py::test_score_display
# Test level: module
#
# Drives the real game code through Node: GameSession.update runs the game and
# the real Renderer draws the score into a fake DOM element; the visible text
# is inspected during play and after an alien destruction.
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
import { createSession, createRenderer } from './game.js';
function element() {
  const e = {
    style: {},
    classList: { _: new Set(), add(...c) { c.forEach((x) => this._.add(x)); },
                 remove(...c) { c.forEach((x) => this._.delete(x)); },
                 contains(c) { return this._.has(c); } },
    value: '', _html: '', _text: '',
    addEventListener() {}, setAttribute() {}, getAttribute() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
  };
  Object.defineProperty(e, 'textContent', {
    get() { return this._text; }, set(v) { this._text = String(v); },
  });
  Object.defineProperty(e, 'innerHTML', {
    get() { return this._html; },
    set(v) { this._html = String(v);
             this._text = String(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); },
  });
  return e;
}
const ctx = { canvas: { width: 800, height: 600 }, clearRect() {}, fillRect() {}, fillText() {}, fillStyle: null };
const dom = { score: element(), gameOver: element(), highscoreOverlay: element(),
              initialsPrompt: element(), shipSelection: element() };
const renderer = createRenderer(ctx, dom);
const session = createSession({ screenWidth: 800, screenHeight: 600 });
session.update({ left: false, right: false, fire: false, confirm: true, highscoreToggle: false }); // enter Playing
session.update({ left: false, right: false, fire: true, confirm: false, highscoreToggle: false }); // shot
session.formation.speed = 0;
const alien = session.formation.aliens[0];
const projectile = session.projectiles.projectiles[0];
projectile.x = alien.x + 10;
projectile.y = alien.y;
let state = session.update({ left: false, right: false, fire: false, confirm: false, highscoreToggle: false });
renderer.render(state);
const showing = dom.score.textContent;
state = session.update({ left: false, right: false, fire: false, confirm: false, highscoreToggle: false });
renderer.render(state);
const updated = dom.score.textContent;
process.stdout.write(JSON.stringify({
  ok: true,
  showing: showing,
  updated: updated,
  score: state.score,
  visible: showing !== '',
}));
"""


class TestUI(unittest.TestCase):
    def test_score_display(self):
        result = run_js(SOURCE)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertTrue(result["visible"], "the score must be shown in a visible element during play")
        self.assertIn(str(result["score"]), result["showing"],
                      "the element must show the numeric score: %r" % (result["showing"],))
        self.assertEqual(result["updated"], "Score: %d" % result["score"],
                         "the display must update after alien destruction")


if __name__ == '__main__':
    unittest.main()
