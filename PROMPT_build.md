Read AGENTS.md, PROGRESS.md, IMPLEMENTATION_PLAN.md and OVERNIGHT_RUNBOOK.md.

Mantra: build independently, verify completely, then hand over for human validation.
Implement exactly the first unchecked task of the family pilot. Follow its scope and acceptance.
Run targeted checks plus npm test, npm run typecheck, and npm run lint before committing.
Keep engine rules, worker AI, GitHub Pages and both build targets. No backend or campaign work.

Track failures across passes; after three failed fix attempts leave the task unchecked, record
BLOCKED and restore a green runtime without discarding other work. Never weaken a gate or count
an untested shortcut as completion. Follow the runbook's morning cutoff and readiness criteria.

On success update plan checkbox, PROGRESS, evidence and decisions in the same local commit as
code. Never push or deploy. Preserve pre-existing untracked files. Stop after this one task.
Do not start deferred BACKLOG items or launch another runner. Completion requires final release
qualification and REVIEW_READY.md, not just checked boxes.
