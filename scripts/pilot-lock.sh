#!/usr/bin/env bash
# Worktree-local ownership for scheduled passes; does not launch an agent or alter shared refs.
set -euo pipefail
cd "$(dirname "$0")/.."
dry_run=false
if [[ "${1:-}" == --dry-run ]]; then dry_run=true; shift; fi
operation="${1:-status}"
token="${2:-}"
lock=.pilot-lock
if [[ "$operation" == status ]]; then
  if [[ -d "$lock" ]]; then
    cat "$lock/owner" "$lock/started-utc" 2>/dev/null || true
    exit 1
  fi
  echo 'No active pilot pass'
  exit 0
fi
if [[ "$operation" != acquire && "$operation" != release ]]; then
  echo 'Usage: pilot-lock.sh [--dry-run] acquire|release TOKEN, or status' >&2; exit 2
fi
if [[ ! "$token" =~ ^[a-zA-Z0-9_-]{8,100}$ ]]; then
  echo 'Provide a unique 8–100 character alphanumeric/dash/underscore token' >&2; exit 2
fi
if [[ "$dry_run" == true ]]; then
  echo "Would $operation the worktree-local pass lock for $token"; exit 0
fi
if [[ "$operation" == acquire ]]; then
  if ! mkdir "$lock" 2>/dev/null; then
    echo 'Pilot pass already owned; inspect status and do not overwrite it' >&2; exit 1
  fi
  printf '%s\n' "$token" > "$lock/owner"
  date -u '+%Y-%m-%dT%H:%M:%SZ' > "$lock/started-utc"
  echo "Acquired pilot pass: $token"
else
  if [[ ! -d "$lock" ]]; then echo 'No active pilot pass'; exit 0; fi
  if [[ ! -f "$lock/owner" || "$(cat "$lock/owner")" != "$token" ]]; then
    echo 'Refusing to release a different or incomplete ownership claim' >&2; exit 1
  fi
  rm "$lock/owner" "$lock/started-utc"
  rmdir "$lock"
  echo "Released pilot pass: $token"
fi
