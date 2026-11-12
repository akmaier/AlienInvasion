# SPEC: IMPLEMENTATION JAVASCRIPT WEB
# *Check:* tests/integration/test_web_implementation.py::test_client_side_application
# Test level: subsystem
#
# index.html (repository root) must load a .js file and the game must run
# client-side without a server: the real game.js loads in plain Node (it skips
# the browser start-up when window is absent) and exports the session and
# renderer factories.
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


class TestWebImplementation(unittest.TestCase):
    def test_client_side_application(self):
        index = (ROOT / 'index.html').read_text(encoding='utf-8')
        self.assertIn('<canvas', index, "index.html must contain a canvas element")
        self.assertRegex(index, r'<script[^>]*\bsrc=["\'][^"\']*\.js["\']',
                         "index.html must load a .js file")
        result = run_js(
            "import { createSession, createRenderer } from './game.js';"
            "process.stdout.write(JSON.stringify({"
            "ok: typeof createSession === 'function' && typeof createRenderer === 'function'"
            "}));"
        )
        self.assertTrue(result["ok"], "game.js must load as a client-side ES module without a server")


if __name__ == '__main__':
    unittest.main()
