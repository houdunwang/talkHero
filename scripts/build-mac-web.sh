#!/usr/bin/env bash

set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
envrc_file="$project_root/.envrc"

if [ -z "${HD_DIRENV_READY:-}" ] && [ -f "$envrc_file" ] && command -v direnv >/dev/null 2>&1; then
  direnv allow "$project_root" >/dev/null 2>&1 || true
  cd "$project_root"
  exec direnv exec "$project_root" env \
    HD_DIRENV_READY=1 \
    CSC_NAME="${CSC_NAME:-}" \
    bash "$0"
fi

run_build() {
  pnpm run clean
  pnpm run build:native
  electron-vite build
  electron-builder --mac --arm64
  node "$project_root/scripts/create-release-aliases.cjs" mac
}

cd "$project_root"
run_build
