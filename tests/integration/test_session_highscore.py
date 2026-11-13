# SPEC: SESSION HIGHSCORE DATA / LIMIT / DISPLAY GAMEOVER / DISPLAY INGAME / DISPLAY ENTRIES /
#       KEPT ON NEW SESSION / KEPT ON RELOAD / COOKIE STORAGE
# Modules: MOD-game-logic, MOD-rendering
# *Check:* tests/integration/test_session_highscore.py::test_highscore_entry_data
# *Check:* tests/integration/test_session_highscore.py::test_highscore_limit_and_order
# *Check:* tests/integration/test_session_highscore.py::test_highscore_display_gameover
# *Check:* tests/integration/test_session_highscore.py::test_highscore_access_ingame
# *Check:* tests/integration/test_session_highscore.py::test_highscore_display_entries
# *Check:* tests/integration/test_session_highscore.py::test_highscore_kept_on_new_session
# *Check:* tests/integration/test_session_highscore.py::test_highscore_kept_on_reload
# *Check:* tests/integration/test_session_highscore.py::test_highscore_stored_in_cookie
# Test level: system
#
# Drives the real game code through Node: GameSession owns a HighscoreStore,
# entries hold score/initials/timestamp, the list is capped at ten sorted by
# score descending, the GameOver screen and the in-game 'H' overlay show every
# entry's initials and score, a restart by the button keeps the list, and the
# list is written to a cookie of the page (a stand-in for document.cookie,
# tests/helpers/fake_cookie_jar.mjs) from which a reloaded page reads it back.
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

SOURCE_DISPLAY_ENTRIES = r"""
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
const ctx = { canvas: { width: 800, height: 600 }, clearRect() {}, fillRect() {}, fillText() {},
              beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, fillStyle: null };
const dom = { score: element(), gameOver: element(), highscoreOverlay: element(),
              initialsPrompt: element(), shipSelection: element() };
const renderer = createRenderer(ctx, dom);
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
const session = createSession({ screenWidth: 800, screenHeight: 600 });
session.update({ ...NOOP, confirm: true }); // Playing
const entries = [[731, 'ABC'], [512, 'KLM'], [97, 'XYZ']];
let ts = 1000;
for (const [score, initials] of entries) {
  session.finalScore = score;
  session.submitInitials(initials, ts++);
}
session.toggleHighscoreOverlay(); // open with 'H' during play
renderer.render(session.update(NOOP));
const ingame = dom.highscoreOverlay.textContent;
session.toggleHighscoreOverlay();
session.formation.speed = 0;
session.formation.aliens[0].y = session.ship.y - session.formation.aliens[0].height; // game over
renderer.render(session.update(NOOP));
const gameover = dom.gameOver.textContent;
process.stdout.write(JSON.stringify({ ok: true, entries, ingame, gameover }));
"""

SOURCE_KEPT_ON_NEW_SESSION = FAKE_DOM + r"""
step({ confirm: true }); // Playing
endGame();
session.submitInitials('KEP', 1000);
step({});
const before = session.highscores.getEntries();
const clicked = clickRestartButton(dom.gameOver);
const state = step({});
process.stdout.write(JSON.stringify({ ok: true, clicked, before, phase: state.phase,
  after: state.highscores }));
"""

COOKIE_GAME = r"""
import { createSession } from './game.js';
import { createCookieJar } from './tests/helpers/fake_cookie_jar.mjs';
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
const jar = createCookieJar();
globalThis.document = jar; // the page's document.cookie
function playOneGame(session, initials, timestamp) {
  session.update({ ...NOOP, confirm: true }); // Playing
  session.formation.speed = 0;
  session.formation.aliens[0].y = session.ship.y - session.formation.aliens[0].height;
  session.update(NOOP); // GameOver
  session.submitInitials(initials, timestamp);
}
"""

SOURCE_KEPT_ON_RELOAD = COOKIE_GAME + r"""
const first = createSession({ screenWidth: 800, screenHeight: 600 }); // page load
playOneGame(first, 'REL', 1000);
const before = first.highscores.getEntries();
const reloaded = createSession({ screenWidth: 800, screenHeight: 600 }); // page reloaded
process.stdout.write(JSON.stringify({ ok: true, before, after: reloaded.getState().highscores }));
"""

SOURCE_STORED_IN_COOKIE = COOKIE_GAME + r"""
const session = createSession({ screenWidth: 800, screenHeight: 600 });
session.update({ ...NOOP, confirm: true });
session.finalScore = 77;
session.submitInitials('CKE', 4242);
const stored = [];
for (const pair of jar.cookie.split('; ').filter(Boolean)) {
  const value = pair.slice(pair.indexOf('=') + 1);
  try { stored.push(JSON.parse(decodeURIComponent(value))); } catch (e) { stored.push(null); }
}
process.stdout.write(JSON.stringify({ ok: true, cookie: jar.cookie, stored }));
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

    def test_highscore_display_entries(self):
        result = run_js(SOURCE_DISPLAY_ENTRIES)
        self.assertTrue(result["ok"], "driver reported failure")
        for where in ("gameover", "ingame"):
            for score, initials in result["entries"]:
                self.assertIn(initials, result[where],
                              "%s list shows the initials %s: %r" % (where, initials, result[where]))
                self.assertIn(str(score), result[where],
                              "%s list shows the score %d: %r" % (where, score, result[where]))

    def test_highscore_kept_on_new_session(self):
        result = run_js(SOURCE_KEPT_ON_NEW_SESSION)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertEqual(len(result["before"]), 1, "the entry must exist before the restart")
        self.assertTrue(result["clicked"], "the game-over screen must hold a restart button")
        self.assertEqual(result["phase"], "ShipSelection", "the restart starts a new game session")
        self.assertEqual(result["after"], result["before"],
                         "the new game session keeps the highscore list")

    def test_highscore_kept_on_reload(self):
        result = run_js(SOURCE_KEPT_ON_RELOAD)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertEqual(len(result["before"]), 1, "the entry must exist before the reload")
        self.assertEqual(result["after"], result["before"],
                         "the reloaded page holds the same highscore list")

    def test_highscore_stored_in_cookie(self):
        result = run_js(SOURCE_STORED_IN_COOKIE)
        self.assertTrue(result["ok"], "driver reported failure")
        entry = {"score": 77, "initials": "CKE", "timestamp": 4242}
        self.assertTrue(any(isinstance(v, list) and entry in v for v in result["stored"]),
                        "a cookie of the page holds the entry: %r" % (result["cookie"],))

if __name__ == '__main__':
    unittest.main()
