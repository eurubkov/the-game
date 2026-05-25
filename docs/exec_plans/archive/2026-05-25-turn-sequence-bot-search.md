# Add Bounded Turn-Sequence Bot Search

This ExecPlan lives in `docs/exec_plans/active/` while work is ongoing. Interpret that path relative to the git repository root. Move it to `docs/exec_plans/archive/` only after every remaining `Progress` item is complete and the implementation has been delivered.

Filename: `2026-05-25-turn-sequence-bot-search.md`

This ExecPlan is a living document. Keep `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` up to date as work proceeds.

## Purpose / Big Picture

The bot currently improves 2-player and 3-player games by starting deterministic rollouts earlier, but it still chooses a single immediate action and then lets the existing greedy policy finish the turn. After this change, the bot will evaluate bounded complete turn sequences as candidate plans before committing to the first action. A turn sequence means the ordered cards the active player will play this turn, optionally followed by ending the turn when legal.

The user-visible result is better bot play on seeded simulations, especially cases where the first card matters because it enables or blocks a stronger second or third card in the same turn. The proof is benchmark output from `npm run benchmark:bot` over seeds `1-20` for player counts `1,2,3,5`, plus focused tests that guard a known bad seed.

## Progress

- [x] (2026-05-25 00:00Z) Read the current bot, benchmark script, and test shape.
- [x] (2026-05-25 00:05Z) Create this execution plan under `docs/exec_plans/active/`.
- [x] (2026-05-25 00:10Z) Implement bounded turn-sequence generation and evaluation inside `src/CooperativeMCTSBot.ts`.
- [x] (2026-05-25 00:20Z) Add regression coverage for seeded two-player collapse avoidance and mid-turn sequence improvement.
- [x] (2026-05-25 00:30Z) Run targeted and full benchmark sweeps and keep only changes backed by evidence.
- [x] (2026-05-25 00:40Z) Run full tests, production build, and `git diff --check`.
- [x] (2026-05-25 00:45Z) Record outcomes and move this plan to `docs/exec_plans/archive/`.

## Surprises & Discoveries

- Observation: Earlier broad reducer-backed exact search was too slow and regressed sampled solo seeds because incomplete search scores influenced choices.
  Evidence: A prior prototype produced poor solo sampled results such as `seed 1: 6`, `seed 3: 12`, and `seed 13: 28`.
- Observation: Earlier rollout thresholds are evidence-backed for 2-player and 3-player games.
  Evidence: Seeds `11-20` improved from `2p avg 10.00/worst 42` to `2p avg 1.90/worst 10`, and from `3p avg 4.60/worst 25` to `3p avg 1.30/worst 5`.
- Observation: Broad sequence search improved some two-player totals but was too slow and could move wins between seeds.
  Evidence: Running sequence search across the full `46-60` deck window improved two-player aggregate totals but made some seeds take 15-35 seconds. Narrower and stricter variants either lost the improvement or worsened target seeds.
- Observation: The accepted gate keeps total two-player wins flat while improving aggregate card count.
  Evidence: Across two-player seeds `1-20`, wins stayed at `14/20`, average remaining cards improved from `1.15` to `0.70`, and worst case improved from `10` to `8`.

## Decision Log

- Decision: Keep the search deterministic and reducer-backed.
  Rationale: The game reducer already enforces draw, end-turn, turn-order, and endgame behavior, so candidate sequence evaluation should apply real boardgame.io actions rather than a separate approximate simulator.
  Date/Author: 2026-05-25 Codex
- Decision: Bound sequence generation by candidate count and extra plays instead of trying exhaustive search.
  Rationale: Exhaustive search over all cards and piles grows quickly, especially with several bots. Bounded generation can improve decisions while keeping UI bot turns usable.
  Date/Author: 2026-05-25 Codex
- Decision: Ship only evidence-backed sequence search.
  Rationale: The previous solo full-game search showed that a seemingly stronger search can improve one seed and regress another. Benchmarks must decide whether the code stays.
  Date/Author: 2026-05-25 Codex
- Decision: Gate turn-sequence search to two-player mid-turn states with deck length `46-60`.
  Rationale: Solo search regressed sampled games, three-player search was slower without enough benefit, and five-player behavior was already sensitive. The two-player mid-turn window improved aggregate seeds `1-20` without reducing total wins.
  Date/Author: 2026-05-25 Codex

## Outcomes & Retrospective

Implemented bounded turn-sequence generation and scoring in `src/CooperativeMCTSBot.ts`, gated to the evidence-backed two-player mid-turn window. Added focused regression coverage in `src/CooperativeMCTSBot.test.js`.

Two-player seeds `1-10` moved from `avg 0.40/worst 2/wins 7/10` to `avg 0.30/worst 2/wins 8/10`. Two-player seeds `11-20` moved from `avg 1.90/worst 10/wins 7/10` to `avg 1.10/worst 8/wins 6/10`. Across all two-player seeds `1-20`, wins stayed flat at `14/20`, average remaining cards improved from `1.15` to `0.70`, and worst case improved from `10` to `8`.

Solo, three-player, and five-player benchmark summaries stayed at the previous checkpoint because sequence search is not enabled for those counts. Remaining gaps are still solo seed `13` at `28` cards and five-player seed `12` at `11` cards; attempted broader search was not reliable enough to ship.

The implementation work is complete and this file is ready to move from `docs/exec_plans/active/` to `docs/exec_plans/archive/`.

## Context and Orientation

The bot lives in `src/CooperativeMCTSBot.ts`. Despite the class name, it no longer uses boardgame.io random MCTS. It subclasses `Bot`, enumerates legal moves through `TheGame.ai.enumerate`, and uses `CreateGameReducer` to apply candidate boardgame.io actions.

The game rules live in `src/TheGame.tsx`. Important exported helpers are `CanPlayCard`, `MinRequiredMoves`, pile names, and `PILES_MAP`. These define whether a card is legal on an ascending or descending pile, including the backwards-by-10 exception.

The benchmark harness is `scripts/benchmark-bot.js`. It supports `--seeds`, `--players`, `--depth`, and `--json`, and reports average, median, worst, and wins for each player count. The existing focused bot tests are in `src/CooperativeMCTSBot.test.js`.

## Plan of Work

First, add helpers in `src/CooperativeMCTSBot.ts` to produce bounded legal turn sequences from the current state. Each sequence should be made of existing `MAKE_MOVE` actions from `TheGame.ai.enumerate`, not synthetic state edits. Generation should include required plays, useful backwards-by-10 jumps, low-damage ordinary plays, and ending the turn when legal. It should cap branching so a bot turn remains finite.

Second, add a new `pickSequenceSearchAction` path before or around the existing single-action rollout. For each candidate sequence, apply the whole sequence through the boardgame.io reducer. Then score the resulting state by running the existing deterministic rollout. The bot returns only the first action in the winning sequence, because boardgame.io asks the bot for one move at a time.

Third, keep the previous baseline action as a candidate and bias ties toward it. That prevents churn when sequence search finds equivalent lines. If the sequence search cannot produce a valid improvement, the bot falls back to the existing rollout action.

Fourth, add or adjust tests so a known bad seeded game remains protected. Use benchmarks, not intuition, to decide final thresholds and sequence bounds.

## Concrete Steps

Run commands from the repository root:

    cd /Users/zhekau/Documents/development/repos/the-game
    CI=true npm test -- --watchAll=false src/CooperativeMCTSBot.test.js
    npm run benchmark:bot -- --seeds=13,16,18,20 --players=2,3
    npm run benchmark:bot -- --seeds=1,2,3,4,5,6,7,8,9,10 --players=1,2,3,5
    npm run benchmark:bot -- --seeds=11,12,13,14,15,16,17,18,19,20 --players=1,2,3,5
    CI=true npm test -- --watchAll=false
    npm run build
    git diff --check

Expected benchmark success is improvement or no meaningful regression against the current post-threshold baseline: `1p avg 2.60/worst 12` for seeds `1-10`, `1p avg 4.10/worst 28` for seeds `11-20`, `2p avg 0.40/worst 2` for seeds `1-10`, `2p avg 1.90/worst 10` for seeds `11-20`, `3p avg 1.20/worst 5` for seeds `1-10`, `3p avg 1.30/worst 5` for seeds `11-20`, and unchanged 5-player behavior unless evidence improves it.

## Validation and Acceptance

The change is accepted when `CooperativeMCTSBot` still returns legal actions, the focused bot tests pass, the full test suite and production build pass, and benchmark output shows that sequence search improves at least one relevant weak area without clear regression in the full seed sweeps.

If sequence search improves one player count but regresses another, gate it by player count or deck threshold rather than shipping a global change. If the benchmark improvement is only from slower full-game search that makes turns impractical, do not ship it in the UI bot path.

## Idempotence and Recovery

All benchmark and test commands are safe to rerun. If a prototype hangs, stop only the matching local Node process for that prototype and keep the source tree unchanged. If sequence search regresses benchmarks, revert only the bot search edits made in this plan, preserving unrelated mobile, rules, and UI work already present in the dirty tree.

When implementation is complete, update `Progress`, `Surprises & Discoveries`, `Decision Log`, `Outcomes & Retrospective`, and `Change Log`, then move this file from `docs/exec_plans/active/` to `docs/exec_plans/archive/`.

## Artifacts and Notes

Benchmark evidence kept from this implementation:

- `2p seeds 1-10`: `avg=0.30 median=0 best=0 worst=2 wins=8/10`.
- `2p seeds 11-20`: `avg=1.10 median=0 best=0 worst=8 wins=6/10`.
- `1p seeds 1-10`: `avg=2.60 median=0 best=0 worst=12 wins=6/10`.
- `1p seeds 11-20`: `avg=4.10 median=1 best=0 worst=28 wins=4/10`.
- `3p seeds 1-10`: `avg=1.20 median=1 best=0 worst=5 wins=5/10`.
- `3p seeds 11-20`: `avg=1.30 median=1 best=0 worst=5 wins=5/10`.
- `5p seeds 1-10`: `avg=1.50 median=0 best=0 worst=7 wins=6/10`.
- `5p seeds 11-20`: `avg=3.60 median=4 best=0 worst=11 wins=1/10`.

## Interfaces and Dependencies

The implementation depends on:

- `Bot` and `CreateGameReducer` from boardgame.io.
- `TheGame.ai.enumerate(G, ctx, playerID)` to produce legal boardgame.io actions.
- `PickCooperativeBotAction`, `ScoreBotMove`, and `GetBotMoveDamage` in `src/CooperativeMCTSBot.ts` for existing fallback policy and candidate ordering.
- `scripts/benchmark-bot.js` for objective measurement.

No new package dependency is planned.

## Change Log

- 2026-05-25: Created the plan. Reason: user asked for a `/plan` and implementation for a stronger deterministic solver/search.
- 2026-05-25: Completed and archived the plan. Reason: sequence search implementation, regression tests, benchmarks, full tests, build, and diff check all completed.
