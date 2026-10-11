# STARLEAP backlog

## Delivery principle

Build independently → verify completely → hand over for human validation.
Tests and agent-driven browser review establish correctness; family play establishes enjoyment.
The executable queue is IMPLEMENTATION_PLAN.md only. This backlog contains no unchecked tasks
so that a loop cannot accidentally interpret an idea as permission to implement it.

## Implemented family pilot

FP-1–FP-7 are implemented and qualified. READY_FOR_REVIEW; family product acceptance is next.
See REVIEW_READY.md for the tested revision and evidence. Deferred ideas below remain unapproved.

| ID | Outcome | Tasks | Acceptance |
|---|---|---|---|
| FP-1 | Notice personal improvement, including on a loss | P14.1–P14.4 | Correct per-human records survive resume; genuine new records celebrated |
| FP-2 | Collect four rival victory badges | P14.3–P14.4 | First eligible victory per AI awards once; free play unrestricted |
| FP-3 | Understand target and progress | P14.5 | Home count and target visible, accessible and mobile-friendly |
| FP-4 | Solve five short tactical puzzles | P15.1–P15.3 | Fixed positions, one movable peg, stationary pivots, verified 1–4 move targets |
| FP-5 | Challenge family with the identical puzzle | P15.4–P15.5 | Versioned link, spoiler-free result, no account, share/copy fallback |
| FP-6 | Learn chains correctly | P15.6 | Tutorial teaches and verifies a chain; one whole chain equals one move |
| FP-7 | Receive tested local review build | P14.6, P15.7, P16.1–P16.4 | Full automated gates, browser inspection, evidence, reproducible handoff |

No change to GitHub Pages hosting. Records are browser/device-local and may be lost on clearing
storage. Share links become usable by family on the public site only after the human deploys.
An unpublished build is reviewed through local preview or the generated standalone HTML first.

## Deferred, ordered by likely value after family feedback

| ID | Idea | Why defer / evidence needed |
|---|---|---|
| L-1 | More authored puzzles | Do family members finish, retry, and ask for more? Every puzzle needs verified solutions |
| L-2 | Daily shared puzzle / rotating collection | Requires enough content; seven weekly repeats are not unlimited novelty |
| L-3 | Nova campaign / constellation journey | Three learning missions followed by a Nova match; optional packaging, not a new AI or rule. Build only if people want guided progression |
| L-4 | Vega/Rigel/Sirius chapters | Validate one chapter and difficulty transitions before expanding |
| L-5 | Permanent constellation collection/cosmetic frames | Reward distinct accomplishments, not grinding; avoid clutter and preserve existing themes |
| L-6 | Public daily leaderboard | Separate backend/identity/operating decision; server replay can reuse engine source. Must define versioning, retries, rate limits and fairness; cannot certify unaided play |
| L-7 | Cross-device progress/export | Local-only pilot first; export could precede accounts/cloud sync |
| L-8 | Anonymous telemetry | Separate privacy/product decision; no collection in pilot |
| L-9 | Human-calibrated AI curve | Observe real beginner/expert play; AI tournament strength alone is insufficient |
| L-10 | 3–6-player progression and AI outcome validation | Existing multiplayer remains; do not generalize 2P records without fairness and stalemate work |
| L-11 | Richer game artwork and optional replay highlights | Existing portraits/CSS/SVG suffice; protect board clarity, reduced motion and bundle size |
| L-12 | Non-directional “long chain available” discovery cue | Extra move-generation cost; a long chain is not necessarily strategically good. Must not replace hints |
| L-13 | Comeback/kingmaker mechanics | Changes game balance/rules; separate design and playtest, not gamification polish |

## Deliberately excluded

Spendable currency, XP grinding, unlimited per-hop points, power-ups, energy/lives, punitive daily
streaks, gated free-play opponents, social accounts/chat, fabricated competitors, and automatic
publishing. No need for these to test whether STARLEAP is enjoyable and shareable.

## Family validation after automated qualification

Give the build to a few family members and observe: can they identify their target, solve the
first puzzle unaided, distinguish hops from moves, find a personal best/badge, retry voluntarily,
and send a challenge someone else opens successfully? Ask whether they want another puzzle or
match and where they felt confused. Capture observations, not invented retention percentages.
No analytics service is needed for this qualitative pilot; clicks/shares are not automatically
measured. Human acceptance and deployment remain separate from READY_FOR_REVIEW.
