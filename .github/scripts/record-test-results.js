#!/usr/bin/env node
/**
 * Agent M's test schedule for akmaier/AlienInvasion — record one test run.
 *
 * Runs after the two test steps (`npm test` for the JavaScript suites,
 * `python3 -m unittest discover` for the SPEC-named Python checks). It runs
 * every test file once to record per-file pass/fail, parses each test file's
 * header for its level and the SPEC requirements it guards
 * (`// Test level:` / `// Requirements exercised:` in JavaScript,
 * `# Test level:` / `# SPEC:` / `# *Check:` in Python), and writes one JSON
 * record per run on the `test-results` branch:
 *
 *   results/latest.json      latest run, overwritten on every run
 *   results/run-<run-id>.json  history
 *
 * Agent M's Tests page reads this record: tests per level (module /
 * subsystem / system / release, per docs/plan/* front matter), the SPEC
 * requirement each test guards, and which of the product's requirements are
 * guarded by a passing test. Levels and requirements are taken from the
 * repository itself (SPEC.md, docs/plan/*.md, the test headers) — never
 * remembered from outside.
 *
 * The record is written even when tests fail (the step then exits non-zero so
 * the workflow run shows red). The `test-results` branch is the branch
 * .github/workflows/agent-m-main-changed.yml fetches.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';

const ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
const COMMIT = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
const RUN_ID = process.env.GITHUB_RUN_ID || 'local';
const RUN_ATTEMPT = process.env.GITHUB_RUN_ATTEMPT || '1';

const outNpm = process.env.AGENT_M_TESTS_OUTPUT_NPM || '';
const exitNpm = Number(process.env.AGENT_M_TESTS_EXIT_NPM || -1);
const outPy = process.env.AGENT_M_TESTS_OUTPUT_PY || '';
const exitPy = Number(process.env.AGENT_M_TESTS_EXIT_PY || -1);

function first(re, s) {
  const m = s.match(re);
  return m ? m[1] : null;
}

const npmTotal = first(/ℹ tests (\d+)/, outNpm);
const npmPass = first(/ℹ pass (\d+)/, outNpm);
const npmFail = first(/ℹ fail (\d+)/, outNpm);
const pyRan = first(/Ran (\d+) tests/, outPy);
const pyOk = exitPy === 0 && /\nOK\b/.test(outPy);

// Requirement names are read from SPEC.md itself (single source of truth),
// from the ## Requirements section: **NAME** *(source)*.
const specText = readFileSync(`${ROOT}/SPEC.md`, 'utf-8');
const requirementsSection = specText.split('## Requirements')[1] || '';
const SPEC_NAMES = [];
for (const line of requirementsSection.split('\n')) {
  const m = line.match(/^\*\*([^*]+?)\*\*\s*\*\s*\(/);
  if (m) SPEC_NAMES.push(m[1].trim());
}

const LEVEL_BY_DIR = { unit: 'module', component: 'subsystem', system: 'system', integration: 'system', review: 'release' };
const SHORTHAND = {
  LIMIT: 'SESSION HIGHSCORE LIMIT',
  'DISPLAY GAMEOVER': 'SESSION HIGHSCORE DISPLAY GAMEOVER',
  'DISPLAY INGAME': 'SESSION HIGHSCORE DISPLAY INGAME',
  RESET: 'SESSION HIGHSCORE RESET',
  DATA: 'SESSION HIGHSCORE DATA',
};

function headerComment(text) {
  const lines = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('//')) lines.push(line.slice(2));
    else break;
  }
  return lines.join(' ');
}

function specNamesIn(text) {
  const found = [];
  for (const name of SPEC_NAMES) {
    // Whole-name match: start/end of the requirement name bounded by anything
    // that is not a letter (comma, slash, space, parenthesis, ...).
    const re = new RegExp('(^|[^A-Za-z])' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Za-z]|$)', 'i');
    if (re.test(text)) found.push(name);
  }
  return found;
}

function normalizePyToken(token) {
  if (SPEC_NAMES.includes(token)) return token;
  if (SHORTHAND[token]) return SHORTHAND[token];
  return null;
}

function pySpecs(text) {
  const found = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('# SPEC:')) continue;
    const body = line.replace(/^#\s*SPEC:\s*/i, '');
    for (const token of body.split(/[,\/]/).map((t) => t.trim()).filter(Boolean)) {
      const name = normalizePyToken(token);
      if (name && !found.includes(name)) found.push(name);
    }
  }
  return found;
}

function walkTests(dir, acc) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walkTests(p, acc);
    else if (entry.name !== '__init__.py' && (entry.name.endsWith('.js') || entry.name.endsWith('.py') || entry.name.endsWith('.md'))) acc.push(p);
  }
  return acc;
}

const files = walkTests(`${ROOT}/tests`, []).sort();

const fileRecords = [];
let allExecutablePassed = true;
let totalTests = 0;
let totalPassed = 0;
let totalFailed = 0;

for (const p of files) {
  const rel = p.slice(ROOT.length + 1);
  const dir = rel.split('/')[1];
  const level = LEVEL_BY_DIR[dir];
  const text = readFileSync(p, 'utf-8');
  let executable = true;
  let passed = true;
  let testCount = 0;
  let guards = [];

  if (rel.endsWith('.js')) {
    guards = specNamesIn(headerComment(text));
    testCount = (text.match(/(?:^|\n)[ \t]*it\(/g) || []).length;
    try {
      execSync(`node --test "${p}"`, { cwd: ROOT, stdio: 'pipe' });
      process.stderr.write(`record-test-results: PASS ${rel}\n`);
    } catch (e) {
      passed = false;
      process.stderr.write(`record-test-results: FAIL ${rel} status=${e.status}\n`);
      process.stderr.write(`   STDOUT: ${(e.stdout || '').toString().slice(0, 500)}\n`);
      process.stderr.write(`   STDERR: ${(e.stderr || '').toString().slice(0, 1200)}\n`);
    }
  } else if (rel.endsWith('.py')) {
    guards = pySpecs(text);
    testCount = (text.match(/(?:^|\n)[ \t]*def test_/g) || []).length;
    const module = rel.slice(0, -3).replace(/\//g, '.');
    try {
      execSync(`python3 -m unittest ${module}`, { cwd: ROOT, stdio: 'pipe' });
      process.stderr.write(`record-test-results: PASS ${rel}\n`);
    } catch (e) {
      passed = false;
      process.stderr.write(`record-test-results: FAIL ${rel} status=${e.status}\n`);
    }
  } else {
    executable = false; // review document: static check, guarded by its presence
    passed = true;
    guards = specNamesIn(text);
    process.stderr.write(`record-test-results: PASS(review) ${rel}\n`);
  }

  if (executable && !passed) allExecutablePassed = false;
  totalTests += testCount;
  if (passed) totalPassed += testCount; else totalFailed += testCount;

  fileRecords.push({
    file: rel,
    language: rel.endsWith('.py') ? 'python' : rel.endsWith('.md') ? 'markdown' : 'javascript',
    level,
    tests: testCount,
    passed,
    executable,
    guards,
  });
}

const levels = {};
for (const rec of fileRecords) {
  let l = levels[rec.level];
  if (!l) { l = levels[rec.level] = { files: 0, tests: 0, passed: 0, failed: 0 }; }
  l.files += 1;
  l.tests += rec.tests;
  if (rec.passed) l.passed += rec.tests; else l.failed += rec.tests;
}

const requirements = SPEC_NAMES.map((name) => {
  const guarding = fileRecords.filter((r) => r.guards.includes(name) && r.executable);
  const reviewing = fileRecords.filter((r) => r.guards.includes(name) && !r.executable);
  const passing = guarding.some((r) => r.passed) || reviewing.length > 0;
  return {
    name,
    guarded_by: guarding.map((r) => r.file),
    guarded_by_review: reviewing.map((r) => r.file),
    passing,
  };
});

const record = {
  workflow: 'Agent M tests',
  product: 'akmaier/AlienInvasion',
  run_id: RUN_ID,
  run_attempt: RUN_ATTEMPT,
  commit: COMMIT,
  ref: process.env.GITHUB_REF || 'refs/heads/main',
  ran_at: new Date().toISOString(),
  exit_code: allExecutablePassed ? 0 : 1,
  summary: {
    suites: fileRecords.length,
    tests: Number(npmTotal) !== null ? Number(npmTotal) + Number(pyRan || 0) : totalTests,
    passed: Number(npmPass) !== null ? Number(npmPass) + (pyOk ? Number(pyRan || 0) : 0) : totalPassed,
    failed: Number(npmFail) !== null ? Number(npmFail) + (pyOk ? 0 : Number(pyRan || 0)) : totalFailed,
  },
  runner: {
    npm: { tests: npmTotal, passed: npmPass, failed: npmFail, exit: exitNpm },
    python: { ran: pyRan, ok: pyOk, exit: exitPy },
  },
  levels,
  requirements,
  files: fileRecords,
};

function sh(cmd, opts = {}) {
  return execSync(cmd, { ...opts, encoding: 'utf-8' });
}

function branchExistsLocally(branch) {
  try { sh(`git rev-parse --verify refs/heads/${branch}`); return true; } catch { return false; }
}

// Committer identity for the record commit.
try { sh('git config user.name'); } catch { sh('git config user.name "Agent M"'); }
try { sh('git config user.email'); } catch { sh('git config user.email "agent-m@users.noreply.github.com"'); }

// Ensure a local test-results branch: from origin if it exists there,
// otherwise as an orphan branch holding only results.
if (!branchExistsLocally('test-results')) {
  try {
    sh('git fetch origin test-results:test-results');
  } catch {
    sh('git checkout --orphan test-results');
    sh('git rm -rf --quiet .');
    mkdirSync(`${ROOT}/results`, { recursive: true });
    writeFileSync(`${ROOT}/results/README.md`, 'Agent M test results for akmaier/AlienInvasion — see results/*.json\n');
    sh('git add -A');
    sh('git commit -q -m "test-results: results branch"');
    sh('git checkout -q main');
  }
}

sh('git checkout -q test-results');
const resultsDir = `${ROOT}/results`;
mkdirSync(resultsDir, { recursive: true });
writeFileSync(`${resultsDir}/latest.json`, JSON.stringify(record, null, 2) + '\n');
writeFileSync(`${resultsDir}/run-${RUN_ID}.json`, JSON.stringify(record, null, 2) + '\n');
sh(`git add results/latest.json results/run-${RUN_ID}.json`);
sh(`git commit -q -m "test-results: record run ${RUN_ID} @ ${COMMIT.slice(0, 10)}"`);
sh('git push -q origin test-results');
sh('git checkout -q main');

process.exit(allExecutablePassed ? 0 : 1);
