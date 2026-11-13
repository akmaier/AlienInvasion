# SPEC: GAME OVER CONDITION / GAME OVER RESTART BUTTON /
#       GAME OVER RESTART BUTTON HIDDEN / GAME OVER RESTART NEW SESSION / SESSION START STATE
# Modules: MOD-game-logic, MOD-rendering
# *Check:* tests/integration/test_game_over.py::test_game_over_conditions
# *Check:* tests/integration/test_game_over.py::test_restart_button_shown_on_game_over
# *Check:* tests/integration/test_game_over.py::test_restart_button_hidden_outside_game_over
# *Check:* tests/integration/test_game_over.py::test_restart_button_starts_new_session
# *Check:* tests/integration/test_game_over.py::test_new_session_start_state
# Test level: system
#
# Drives the real game code through Node: an alien reaching the bottom or
# colliding with the ship switches GameSession to GameOver and stops all
# entity spawning; the game-over screen shows a restart button only in
# GameOver, and clicking it starts a new game session in the page-load
# start state.
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

# Fake DOM shared by the restart-button drivers: elements record their
# event listeners, and a click is dispatched with a target whose closest()
# matches the button's class when the element's markup holds that button.
FAKE_DOM = r"""
import { createSession, createRenderer, connectRestart } from './game.js';
const NOOP = { left: false, right: false, fire: false, confirm: false, highscoreToggle: false };
function element() {
  const e = { style: {}, classList: { _: new Set(), add(...c) { c.forEach((x) => this._.add(x)); },
            remove(...c) { c.forEach((x) => this._.delete(x)); },
            contains(c) { return this._.has(c); } }, value: '', _html: '', _text: '', _listeners: {},
    addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
    setAttribute() {}, getAttribute() { return null; }, focus() {}, blur() {},
    querySelector() { return null; }, querySelectorAll() { return []; } };
  Object.defineProperty(e, 'textContent', { get() { return this._text; }, set(v) { this._text = String(v); } });
  Object.defineProperty(e, 'innerHTML', { get() { return this._html; },
    set(v) { this._html = String(v); this._text = String(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); } });
  return e;
}
const BUTTON = /<button[^>]*class="[^"]*restart-button[^"]*"[^>]*>([^<]*)<\/button>/;
function hasRestartButton(el) { return BUTTON.test(el.innerHTML); }
function visibleRestartButton(dom) {
  return Object.values(dom).some((el) => el.classList.contains('show') && hasRestartButton(el));
}
function clickRestartButton(el) {
  if (!hasRestartButton(el)) return false;
  const target = { closest(sel) { return sel === '.restart-button' ? target : null; } };
  for (const fn of el._listeners.click || []) fn({ target, preventDefault() {} });
  return true;
}
const ctx = { canvas: { width: 800, height: 600 }, clearRect() {}, fillRect() {}, fillText() {},
              beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, fillStyle: null };
const dom = { score: element(), gameOver: element(), highscoreOverlay: element(),
              initialsPrompt: element(), shipSelection: element() };
const renderer = createRenderer(ctx, dom);
const session = createSession({ screenWidth: 800, screenHeight: 600 });
connectRestart(session, renderer);
function step(commands) { const s = session.update({ ...NOOP, ...commands }); renderer.render(s); return s; }
function endGame() {
  session.formation.speed = 0;
  session.formation.aliens[0].y = session.ship.y - session.formation.aliens[0].height; // reaches bottom
  return step({});
}
"""

SOURCE_BUTTON_SHOWN = FAKE_DOM + r"""
step({ confirm: true }); // Playing
const state = endGame();
const awaiting = { phase: state.phase, shown: dom.gameOver.classList.contains('show'),
                   button: hasRestartButton(dom.gameOver), visible: visibleRestartButton(dom) };
session.submitInitials('ABC', 1000);
step({});
process.stdout.write(JSON.stringify({ ok: true, awaiting,
  afterInitials: { shown: dom.gameOver.classList.contains('show'), visible: visibleRestartButton(dom),
                   label: (dom.gameOver.innerHTML.match(BUTTON) || [])[1] || '' } }));
"""

SOURCE_BUTTON_HIDDEN = FAKE_DOM + r"""
const seen = [];
step({}); // ShipSelection
seen.push({ phase: session.phase, visible: visibleRestartButton(dom) });
step({ confirm: true }); // Playing
step({});
seen.push({ phase: session.phase, visible: visibleRestartButton(dom) });
session.toggleHighscoreOverlay(); // highscore overlay open during play
step({});
seen.push({ phase: session.phase, visible: visibleRestartButton(dom) });
session.toggleHighscoreOverlay();
endGame();
session.submitInitials('ABC', 1000);
step({});
clickRestartButton(dom.gameOver); // back to ShipSelection of the new session
step({});
seen.push({ phase: session.phase, visible: visibleRestartButton(dom) });
process.stdout.write(JSON.stringify({ ok: true, seen }));
"""

SOURCE_BUTTON_STARTS_SESSION = FAKE_DOM + r"""
step({ confirm: true }); // Playing
endGame();
session.submitInitials('ABC', 1000);
step({});
const before = session.highscores.getEntries().length;
const clicked = clickRestartButton(dom.gameOver);
const state = step({});
process.stdout.write(JSON.stringify({ ok: true, clicked, before,
  phase: state.phase, shipSelectionShown: dom.shipSelection.classList.contains('show'),
  gameOverShown: dom.gameOver.classList.contains('show'),
  highscores: state.highscores.length, score: state.score }));
"""

SOURCE_START_STATE = FAKE_DOM + r"""
function snapshot(s) {
  const st = s.getState();
  return { score: st.score, aliens: st.aliens, projectiles: st.projectiles,
           ship: { x: st.ship.x, y: st.ship.y, width: st.ship.width, height: st.ship.height,
                   shipType: st.ship.shipType } };
}
const fresh = snapshot(createSession({ screenWidth: 800, screenHeight: 600 }));
// A game that changes score, formation and ship: the slow ship, moved, one
// alien destroyed, the formation stepped, then the game ends.
step({ right: true }); step({}); step({ confirm: true }); // select the slow ship -> Playing
for (let i = 0; i < 5; i++) step({ left: true });
step({ fire: true });
const p = session.projectiles.projectiles[0];
const a = session.formation.aliens[0];
p.x = a.x + 10; p.y = a.y;
step({});
const changed = snapshot(session);
endGame();
session.submitInitials('ABC', 1000);
step({});
clickRestartButton(dom.gameOver);
step({});
process.stdout.write(JSON.stringify({ ok: true, fresh, changed, restarted: snapshot(session) }));
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

    def test_restart_button_shown_on_game_over(self):
        result = run_js(SOURCE_BUTTON_SHOWN)
        self.assertTrue(result["ok"], "driver reported failure")
        awaiting = result["awaiting"]
        self.assertEqual(awaiting["phase"], "GameOver")
        self.assertTrue(awaiting["shown"], "the game-over screen must be shown")
        self.assertTrue(awaiting["button"], "the game-over screen must hold a restart button")
        self.assertTrue(awaiting["visible"], "the restart button must be visible in GameOver")
        after = result["afterInitials"]
        self.assertTrue(after["shown"], "the game-over screen stays after the initials")
        self.assertTrue(after["visible"], "the restart button stays visible after the initials")
        self.assertIn("restart", after["label"].lower(), "the button must be labelled as a restart")

    def test_restart_button_hidden_outside_game_over(self):
        result = run_js(SOURCE_BUTTON_HIDDEN)
        self.assertTrue(result["ok"], "driver reported failure")
        phases = [seen["phase"] for seen in result["seen"]]
        self.assertEqual(phases, ["ShipSelection", "Playing", "Playing", "ShipSelection"])
        for seen in result["seen"]:
            self.assertFalse(seen["visible"],
                             "no restart button may be visible in phase %s" % seen["phase"])

    def test_restart_button_starts_new_session(self):
        result = run_js(SOURCE_BUTTON_STARTS_SESSION)
        self.assertTrue(result["ok"], "driver reported failure")
        self.assertTrue(result["clicked"], "the game-over screen must hold a restart button to click")
        self.assertEqual(result["before"], 1, "the entry exists before the restart")
        self.assertEqual(result["phase"], "ShipSelection",
                         "clicking restart must start a new session at ship selection")
        self.assertTrue(result["shipSelectionShown"], "the ship selection screen must be shown")
        self.assertFalse(result["gameOverShown"], "the game-over screen must be gone")
        self.assertEqual(result["highscores"], 1,
                         "a new game session keeps the highscore list")
        self.assertEqual(result["score"], 0, "a new game session starts with score zero")

    def test_new_session_start_state(self):
        result = run_js(SOURCE_START_STATE)
        self.assertTrue(result["ok"], "driver reported failure")
        fresh, changed, restarted = result["fresh"], result["changed"], result["restarted"]
        self.assertNotEqual(changed["score"], fresh["score"], "the game must have changed the score")
        self.assertNotEqual(changed["aliens"], fresh["aliens"], "the game must have changed the formation")
        self.assertNotEqual(changed["ship"], fresh["ship"], "the game must have changed the ship")
        self.assertEqual(restarted["score"], fresh["score"], "score as on a freshly loaded page")
        self.assertEqual(restarted["aliens"], fresh["aliens"], "formation as on a freshly loaded page")
        self.assertEqual(restarted["ship"], fresh["ship"], "ship as on a freshly loaded page")
        self.assertEqual(restarted["projectiles"], fresh["projectiles"], "no projectiles left over")


if __name__ == '__main__':
    unittest.main()
