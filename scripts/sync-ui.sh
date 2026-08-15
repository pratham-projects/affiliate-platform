#!/usr/bin/env bash
# Pulls UI-only changes from the real affiliate-system source into this demo repo.
#
# Usage:
#   scripts/sync-ui.sh [new-ref]     # defaults to upstream/main
#
# What it does:
#   1. Adds/fetches the git remote `upstream` -> PrathamBhavsar/affiliate-system.
#   2. Diffs app, components, lib, hooks, styles, public between the last-synced
#      sha (read from UPSTREAM.md) and the target ref.
#   3. Applies that diff here with `git apply --3way`.
#
# Protected paths this must never overwrite (see UPSTREAM.md): mock/,
# components/demo/, README.md, UPSTREAM.md, scripts/, vercel.json,
# .env.example. The diff is scoped to the directories above specifically so
# it can't touch any of them, but always review the diff before committing —
# a renamed/moved upstream file can still collide with something under
# components/ or lib/ that this repo also touches.
#
# After a successful apply: extend mock/seed.ts and mock/handlers/*.ts for
# anything the new UI needs that the mock doesn't serve yet, bump the synced
# sha in UPSTREAM.md, `bun install && bun run build`, re-run the scrub
# checklist, then commit.

set -euo pipefail

UPSTREAM_URL="https://github.com/PrathamBhavsar/affiliate-system.git"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_REF="${1:-upstream/main}"

cd "$REPO_ROOT"

if ! git remote get-url upstream >/dev/null 2>&1; then
  echo "Adding remote 'upstream' -> $UPSTREAM_URL"
  git remote add upstream "$UPSTREAM_URL"
fi

echo "Fetching upstream..."
git fetch upstream

LAST_SHA="$(grep -oE '\`[0-9a-f]{40}\`' "$REPO_ROOT/UPSTREAM.md" | head -1 | tr -d '\`')"
if [ -z "$LAST_SHA" ]; then
  echo "Could not find the last-synced sha in UPSTREAM.md" >&2
  exit 1
fi

echo "Diffing app components lib hooks styles public: $LAST_SHA..$TARGET_REF"
git diff "$LAST_SHA..$TARGET_REF" -- app components lib hooks styles public > /tmp/affiliate-platform-sync.patch

if [ ! -s /tmp/affiliate-platform-sync.patch ]; then
  echo "No changes in the tracked UI directories between those refs."
  exit 0
fi

echo "Applying (3-way)..."
git apply --3way /tmp/affiliate-platform-sync.patch

cat <<EOF

Applied. Next steps:
  1. Review the diff for new lib/api/*.ts service methods or endpoints — extend
     mock/handlers/*.ts and mock/seed.ts so the new screen has real data to render.
  2. Update the synced sha in UPSTREAM.md: $LAST_SHA -> $(git rev-parse "$TARGET_REF")
  3. bun install && bun run build
  4. Re-run the scrub checklist.
  5. Commit.
EOF
