#!/bin/sh
# Scaffolds a real local git repo + a real local "origin" remote, so an
# agent can run actual git commit/push commands instead of describing them.
# Usage: sh setup.sh <target-dir>
# Produces <target-dir>/origin-bare (the fake remote) and <target-dir>/work
# (the checkout, already cloned from origin-bare, with one commit pushed).
set -e
TARGET="$1"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$TARGET/origin-bare"
git init --bare -q -b main "$TARGET/origin-bare"

git clone -q "$TARGET/origin-bare" "$TARGET/work"
mkdir -p "$TARGET/work/src/services"
cp "$SCRIPT_DIR/orderService.ts" "$TARGET/work/src/services/orderService.ts"

cd "$TARGET/work"
git config user.email "eval@example.com"
git config user.name "Eval Runner"
git add src/services/orderService.ts
git commit -q -m "feat: add orderTotal helper"
git push -q -u origin main
