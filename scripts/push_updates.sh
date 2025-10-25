#!/usr/bin/env bash
set -euo pipefail

DEFAULT_REMOTE="origin"
DEFAULT_BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || echo work)"
REMOTE_URL="https://github.com/flickpause-coder/Invoice-Generator.git"

usage() {
  cat <<USAGE
Usage: ${0##*/} [branch] [remote]

Synchronizes the current repository with GitHub by ensuring the remote exists,
fetching the latest changes, merging the remote main branch, and pushing the
specified branch.

Arguments:
  branch  The local branch to push (defaults to the current branch: $DEFAULT_BRANCH)
  remote  The remote name to push to (defaults to: $DEFAULT_REMOTE)
USAGE
}

if [[ ${1:-} == "-h" || ${1:-} == "--help" ]]; then
  usage
  exit 0
fi

BRANCH=${1:-$DEFAULT_BRANCH}
REMOTE=${2:-$DEFAULT_REMOTE}

if ! git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  echo "Error: branch '$BRANCH' does not exist." >&2
  exit 1
fi

if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  echo "Remote '$REMOTE' not found. Adding it with URL: $REMOTE_URL"
  git remote add "$REMOTE" "$REMOTE_URL"
fi

echo "Fetching updates from $REMOTE..."
git fetch "$REMOTE"

if git show-ref --verify --quiet "refs/remotes/$REMOTE/main"; then
  echo "Merging $REMOTE/main into $BRANCH..."
  if ! git merge --no-edit "$REMOTE/main"; then
    echo
    echo "Merge conflicts detected. Resolve them manually, run 'git add' on the"
    echo "fixed files, commit the resolution, then rerun this script to push."
    exit 1
  fi
else
  echo "Remote main branch not found on $REMOTE; skipping merge step."
fi

echo "Pushing $BRANCH to $REMOTE..."
git push -u "$REMOTE" "$BRANCH"

echo "Push complete."
