# Requirements: PLAYER SHIP SELECTION, PLAYER SHIP TYPE REGULAR, PLAYER SHIP TYPE SLOW, PLAYER SHIP SLOW MOVEMENT, PLAYER SHIP SLOW SPECIAL SHOT

**The change.** Added PLAYER SHIP SELECTION; added PLAYER SHIP TYPE REGULAR; added PLAYER SHIP TYPE SLOW; added PLAYER SHIP SLOW MOVEMENT; added PLAYER SHIP SLOW SPECIAL SHOT; the rest of the section is as the person wrote it.

**Why.** Split PLAYER SHIP REGULAR and PLAYER SHIP SLOW into single-statement requirements to satisfy ONE STATEMENT PER REQUIREMENT. PLAYER SHIP REGULAR became PLAYER SHIP TYPE REGULAR (availability only; movement/firing covered by existing general requirements). PLAYER SHIP SLOW became three requirements: PLAYER SHIP TYPE SLOW (availability), PLAYER SHIP SLOW MOVEMENT (slower speed), and PLAYER SHIP SLOW SPECIAL SHOT (projectile destroying up to three aliens). All placed in Core Gameplay group.

**Impact list.**
- PLAYER SHIP SELECTION: added; nothing names it.
- PLAYER SHIP TYPE REGULAR: added; nothing names it.
- PLAYER SHIP TYPE SLOW: added; nothing names it.
- PLAYER SHIP SLOW MOVEMENT: added; nothing names it.
- PLAYER SHIP SLOW SPECIAL SHOT: added; nothing names it.

**Origin.** Source github.com/akmaier. Asked in a conversation in the prompt bar; saved by JOB-20261109-2308-9f1a.
