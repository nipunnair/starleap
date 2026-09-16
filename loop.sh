#!/usr/bin/env bash
set -u
for i in $(seq 1 30); do
  echo "=== iteration $i — $(date) ==="
  cat PROMPT_build.md | claude -p --dangerously-skip-permissions --max-budget-usd 5 \
    2>&1 | tee -a .loop.log
  if ! grep -q '^- \[ \]' IMPLEMENTATION_PLAN.md; then
    echo "done at iteration $i — no unchecked tasks remain"; break
  fi
  sleep 5
done
