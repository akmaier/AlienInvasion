---
model: waterfall
model_file: src/model-catalogue/models/waterfall.md
---

# akmaier/AlienInvasion — Process

Declares exactly one process model: **waterfall** (book *Vibe Coding*, chapter 6), as carried in the instance's catalogue at `src/model-catalogue/models/waterfall.md`. Chosen per the person's instruction to build Alien Invasion following the waterfall model; SPEC §5 requires exactly one declared process model before implementation starts, and none exists yet for the product. The model's five phases run in sequence (Requirements Analysis & Specification → System & Software Design → Development & Testing → Integration & System Testing → Release & Maintenance), each gated by a Reviewer decision before the next phase opens.

## Roles

| Role | Filled by | How many |
| --- | --- | --- |
| Product owner | either | one |
| Developer | either | several |
| Tester | either | several |
| Reviewer | either | several |

## Practices

none

## Branches

| Phase or time box | Branch |
| --- | --- |

No phase or time box has a branch of its own; work merges into the default branch.

## Definition of Done

The job rules hold and no condition is added:
- CI is green;
- the job's first commit holds only tests and CI was red on it;
- every changed code file lies in the folder of one of the job's modules;
- every new test names a requirement and a module;
- every gate before the merge is recorded.

## Gates added by requirements

| Requirement | Between | Artifacts | Condition | Decider |
| --- | --- | --- | --- | --- |

No requirement adds a gate beyond the model's phase gates; the model's gates are the phase-gate reviews between each phase and the next, decided by a Reviewer.