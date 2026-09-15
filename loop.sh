#!/usr/bin/env bash
set -u
for i in $(seq 1 200); do
  echo "=== iteration $i — $(date) ==="
  cat PROMPT_build.md | claude -p --dangerously-skip-permissions --max-turns 60 \
    2>&1 | tee -a .loop.log
  if grep -q "ALL PHASES COMPLETE" PROGRESS.md; then
    echo "done at iteration $i"; break
  fi
  sleep 5
done
