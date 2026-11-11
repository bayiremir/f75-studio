#!/usr/bin/env bash
# Run this on a machine where you're logged into GitHub (gh auth login).
set -euo pipefail
REPO="bayiremir/f75-studio"
if ! gh repo view "$REPO" >/dev/null 2>&1; then
  gh repo create "$REPO" --public --description "Aula Control — unofficial Windows app for AULA F75 keyboards" --source=. --remote=github --push
else
  git remote remove github 2>/dev/null || true
  git remote add github "https://github.com/${REPO}.git"
  git push github main
fi
git push github v0.1.0
echo "Done. Releases: https://github.com/${REPO}/releases"
echo "Actions will build Aula-Control-Setup.exe and Portable.exe from tag v0.1.0"
