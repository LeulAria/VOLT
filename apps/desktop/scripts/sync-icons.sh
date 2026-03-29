#!/usr/bin/env bash
# Sync the icons/ folder from vscode-material-icon-theme into assets/icons/.
# Run from anywhere: bash apps/desktop/scripts/sync-icons.sh
set -euo pipefail

DEST="$(cd "$(dirname "$0")/../src/renderer/public/icons" && pwd)"
REPO="https://github.com/material-extensions/vscode-material-icon-theme.git"
TMP="$(mktemp -d)"

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

echo "Syncing material icons → $DEST"

git -C "$TMP" init -q
git -C "$TMP" remote add origin "$REPO"
git -C "$TMP" config core.sparseCheckout true
echo 'icons/*' > "$TMP/.git/info/sparse-checkout"
git -C "$TMP" pull --depth=1 -q origin main

# Wipe existing SVGs and replace with fresh ones
rm -f "$DEST"/*.svg
cp "$TMP/icons/"*.svg "$DEST/"

COUNT=$(ls "$DEST"/*.svg | wc -l | tr -d ' ')
echo "Done — $COUNT icons in $DEST"
