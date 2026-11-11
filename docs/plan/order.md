# Plan order

The implementation plan steps in waterfall order:

1. `ITM-001-implement-input-module` — module, unit tests
2. `ITM-002-implement-game-logic-module` — module, unit tests (builds on ITM-001)
3. `ITM-003-implement-rendering-module` — module, unit tests (builds on ITM-002)
4. `ITM-004-implement-entry-point-and-loop` — subsystem, component tests (builds on ITM-001..ITM-003, integrates ARC-001)
5. `ITM-005-system-verification` — system, system + release tests (builds on ITM-004)

A phase's jobs start after the gate that closes the phase before; no phase has its own branch, so work merges into the default branch.