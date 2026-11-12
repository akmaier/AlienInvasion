# SPEC: SESSION HIGHSCORE DATA / LIMIT / DISPLAY GAMEOVER / DISPLAY INGAME / RESET
# *Check:* tests/integration/test_session_highscore.py::test_highscore_entry_data
# *Check:* tests/integration/test_session_highscore.py::test_highscore_limit_and_order
# *Check:* tests/integration/test_session_highscore.py::test_highscore_display_gameover
# *Check:* tests/integration/test_session_highscore.py::test_highscore_access_ingame
# *Check:* tests/integration/test_session_highscore.py::test_highscore_reset_on_new_session
# Test level: system
#
# Drives the real game code through Node: GameSession owns a HighscoreStore
# (one per page session), entries hold score/initials/timestamp, the list is
# capped at ten sorted by score descending, the GameOver screen shows it, it is
# reachable in-game via 'H', a restart keeps the list (the session is the
# page's session), and only a fresh page session starts empty.
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


SOURCE_ENTRY = r"""
import { createSession } from './game.js';
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
const session = createSession({ screenWidth: 800, screenHeight: 600 });
session.finalScore = 42;
session.submitInitials('CLA');
const entry = session.highscores.getEntries()[0];
process.stdout.write(JSON.stringify({
  ok: true,
  score: entry.score,
  initials: entry.initials,
  timestamp: entry.timestamp,
}));
"""

SOURCE_LIMIT = r"""
import { createSession } from './game.js';
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
const session = createSession({ screenWidth: 800, screenHeight: 600 });
const scores = [50, 10, 70, 30, 90, 20, 60, 40, 80, 100, 5, 55, 35, 15, 25];
let ts = 1000;
for (const score of scores) {
  session.finalScore = score;
  session.submitInitials('AAA', ts++);
}
const entries = session.highscores.getEntries();
process.stdout.write(JSON.stringify({
  ok: true,
  length: entries.length,
  scores: entries.map((e) => e.score),
  initials: entries.map((e) => e.initials),
}));
"""

SOURCE_DISPLAY_GAMEOVER = r"""
import { createSession, createRenderer } from './game.js';
function element() {
  const e = { style: {}, classList: { _: new Set(), add(...c) { c.forEach((x) => this._.add(x)); },
            remove(...c) { c.forEach((x) => this._.delete(x)); },
            contains(c) { return this._.has(c); } }, value: '', _html: '', _text: '',
    addEventListener() {}, setAttribute() {}, getAttribute() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; } };
  Object.defineProperty(e, 'textContent', { get() { return this._text; }, set(v) { this._text = String(v); } });
  Object.defineProperty(e, 'innerHTML', { get() { return this._html; },
    set(v) { this._html = String(v); this._text = String(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); } });
  return e;
}
const ctx = { canvas: { width: 800, height: 600 }, clearRect() {}, fillRect() {}, fillText() {}, fillStyle: null };
const dom = { score: element(), gameOver: element(), highscoreOverlay: element(),
              initialsPrompt: element(), shipSelection: element() };
const renderer = createRenderer(ctx, dom);
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
const session = createSession({ screenWidth: 800, screenHeight: 600 });
session.update({ ...NOOP, right: true, confirm: true }); // Playing
session.formation.speed = 0;
session.formation.aliens[0].y = session.ship.y - session.formation.aliens[0].height; // game over
session.update({ ...NOOP, fire: false });
session.submitInitials('XYZ', 1000);
renderer.render(session.getState());
const text = dom.gameOver.textContent;
process.stdout.write(JSON.stringify({ ok: true, text: text, showing: dom.gameOver.classList.contains('show') }));
"""

SOURCE_ACCESS_INGAME = r"""
import { createSession, createRenderer } from './game.js';
function element() {
  const e = { style: {}, classList: { _: new Set(), add(...c) { c.forEach((x) => this._.add(x)); },
            remove(...c) { c.forEach((x) => this._.delete(x)); },
            contains(c) { return this._.has(c); } }, value: '', _html: '', _text: '',
    addEventListener() {}, setAttribute() {}, getAttribute() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; } };
  Object.defineProperty(e, 'textContent', { get() { return this._text; }, set(v) { this._text = String(v); } });
  Object.defineProperty(e, 'innerHTML', { get() { return this._html; },
    set(v) { this._html = String(v); this._text = String(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); } });
  return e;
}
const ctx = { canvas: { width: 800, height: 600 }, clearRect() {}, fillRect() {}, fillText() {}, fillStyle: null };
const dom = { score: element(), gameOver: element(), highscoreOverlay: element(),
              initialsPrompt: element(), shipSelection: element() };
const renderer = createRenderer(ctx, dom);
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
const session = createSession({ screenWidth: 800, screenHeight: 600 });
session.update({ ...NOOP, right: true, confirm: true }); // Playing
session.finalScore = 99;
session.submitInitials('BBB'); // an entry exists
session.toggleHighscoreOverlay(); // open with 'H'
session.update({ ...NOOP, fire: false });
renderer.render(session.getState());
const openText = dom.highscoreOverlay.textContent;
const open = dom.highscoreOverlay.classList.contains('show');
session.toggleHighscoreOverlay(); // close again
session.update({ ...NOOP, fire: false });
renderer.render(session.getState());
const closedText = dom.highscoreOverlay.textContent;
const closed = dom.highscoreOverlay.classList.contains('show');
process.stdout.write(JSON.stringify({ ok: true, open: open, openText: openText, closed: closed, closedText: closedText }));
"""

SOURCE_RESET = r"""
import { createSession } from './game.js';
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
const session = createSession({ screenWidth: 800, screenHeight: 600 });
session.update({ ...NOOP, right: true, confirm: true }); // Playing
session.formation.speed = 0;
session.formation.aliens[0].y = session.ship.y - session.formation.aliens[0].height;
session.update({ ...NOOP, fire: false }); // GameOver, awaiting initials
session.submitInitials('CLA', 1000); // keep one entry
const keptBeforeRestart = session.highscores.getEntries().length;
// Restart: a new game in the same session keeps the list.
session.update({ ...NOOP, confirm: true });
const afterRestart = session.highscores.getEntries().length;
// A new page session starts with a fresh, empty store.
const fresh = createSession({ screenWidth: 800, screenHeight: 600 });
const freshStart = fresh.highscores.getEntries().length;
process.stdout.write(JSON.stringify({
  ok: true,
  keptBeforeRestart: keptBeforeRestart,
  phaseAfterRestart: session.getState().phase,
  afterRestart: afterRestart,
  freshStart: freshStart,
}));
"""


class TestSessionHighscore(unittest.TestCase):
    def test_highscore_entry_data(self):
        result = run_js(SOURCE_ENTRY)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertEqual(result["score"], 42)
        self.assertEqual(result["initials"], "CLA")
        self.assertIsInstance(result["timestamp"], int)
        self.assertGreater(result["timestamp"], 0)

    def test_highscore_limit_and_order(self):
        result = run_js(SOURCE_LIMIT)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertEqual(result["length"], 10,
                         "the list keeps at most ten entries: %d" % result["length"])
        self.assertEqual(result["scores"], sorted(result["scores"], reverse=True),
                         "entries are ordered by score descending: %r" % (result["scores"],))

    def test_highscore_display_gameover(self):
        result = run_js(SOURCE_DISPLAY_GAMEOVER)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertTrue(result["showing"], "the highscore list is shown on the game-over screen")
        self.assertIn("XYZ", result["text"], "the game-over screen shows the stored initials")

    def test_highscore_access_ingame(self):
        result = run_js(SOURCE_ACCESS_INGAME)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertTrue(result["open"], "the highscore list can be opened during play ('H')")
        self.assertIn("BBB", result["openText"],
                      "the overlay shows the stored entries: %r" % (result["openText"],))
        self.assertFalse(result["closed"], "the overlay can be closed again")

    def test_highscore_reset_on_new_session(self):
        result = run_js(SOURCE_RESET)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertEqual(result["keptBeforeRestart"], 1,
                         "the entry must exist before the restart")
        self.assertEqual(result["phaseAfterRestart"], "ShipSelection",
                         "a restart returns to ship selection")
        self.assertEqual(result["afterRestart"], 1,
                         "a restart keeps the session highscore list (same page session)")
        self.assertEqual(result["freshStart"], 0,
                         "a new page session starts with an empty highscore list")


if __name__ == '__main__':
    unittest.main()
