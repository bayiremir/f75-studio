#!/usr/bin/env bash
# Push this repo to GitHub and publish Windows exes via the Release workflow.
# Requires: gh auth login   (or GH_TOKEN)
set -euo pipefail

REPO="${GITHUB_REPO:-bayiremir/f75-studio}"
TAG="${1:-v0.1.2}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Run: gh auth login"
  exit 1
fi

if ! gh repo view "$REPO" >/dev/null 2>&1; then
  gh repo create "$REPO" --public \
    --description "Aula Control — unofficial Windows app for AULA F75 keyboards" \
    --source=. --remote=github --push
else
  git remote remove github 2>/dev/null || true
  git remote add github "https://github.com/${REPO}.git"
  git fetch github
  # If histories diverged (e.g. Cursor New Project rewrite), put our tree on github/main
  if ! git merge-base --is-ancestor github/main HEAD 2>/dev/null; then
    echo "Rebasing local tree onto github/main…"
    git reset --soft github/main
    if ! git diff --cached --quiet; then
      git commit -m "Sync packaging fixes onto GitHub main"
    fi
  fi
  git push -u github HEAD:main
fi

# Ensure Actions are usable (no-op if already enabled / insufficient perms)
gh api -X PUT "repos/${REPO}/actions/permissions" -f enabled=true -f allowed_actions=all 2>/dev/null || true

# Create / move tag to current HEAD and push so the Release workflow runs
git tag -f "$TAG"
git push github "refs/tags/${TAG}" --force

echo
echo "Pushed $TAG to https://github.com/${REPO}"
echo "Actions will build Aula-Control-Setup.exe and Aula-Control-Portable.exe."
echo "Watch:  https://github.com/${REPO}/actions"
echo "When green, download from:  https://github.com/${REPO}/releases/latest"
echo
echo "If Actions never starts: open the Actions tab once and click Enable."
