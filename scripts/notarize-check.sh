#!/usr/bin/env bash

set -u

project_root="$(cd "$(dirname "$0")/.." && pwd)"
envrc_file="$project_root/.envrc"

if [ -z "${HD_DIRENV_READY:-}" ] && [ -f "$envrc_file" ] && command -v direnv >/dev/null 2>&1; then
  direnv allow "$project_root" >/dev/null 2>&1 || true
  cd "$project_root" || exit 1
  exec direnv exec "$project_root" env HD_DIRENV_READY=1 bash "$0"
fi

failures=0

normalize_certificate_name() {
  local certificate_name="$1"
  certificate_name="${certificate_name#Developer ID Application: }"
  printf '%s' "$certificate_name"
}

count_non_empty_lines() {
  printf '%s\n' "$1" | sed '/^$/d' | wc -l | tr -d ' '
}

print_ok() {
  printf '[OK] %s\n' "$1"
}

print_warn() {
  printf '[WARN] %s\n' "$1"
}

print_fail() {
  printf '[FAIL] %s\n' "$1"
  failures=$((failures + 1))
}

check_command() {
  local command_name="$1"

  if command -v "$command_name" >/dev/null 2>&1; then
    print_ok "Found command: $command_name"
  else
    print_fail "Missing command: $command_name"
  fi
}

check_optional_env() {
  local env_name="$1"

  if [ -n "${!env_name:-}" ]; then
    print_ok "Environment variable is set: $env_name"
  else
    print_warn "Environment variable is not set: $env_name"
  fi
}

check_certificate() {
  local certificate_name="${CSC_NAME:-}"
  local normalized_name
  local identities
  local matches

  if ! identities="$(security find-identity -v -p codesigning 2>/dev/null)"; then
    print_fail 'Unable to read signing identities from macOS Keychain'
    return
  fi

  if [ -z "$certificate_name" ]; then
    if printf '%s\n' "$identities" | grep -F 'Developer ID Application:' >/dev/null 2>&1; then
      print_ok 'Found at least one Developer ID Application certificate'
    else
      print_fail 'No Developer ID Application certificate found in Keychain'
    fi
    return
  fi

  if [[ "$certificate_name" == Developer\ ID\ Application:* ]]; then
    matches="$(printf '%s\n' "$identities" | grep -F "$certificate_name" || true)"
  else
    normalized_name="$(normalize_certificate_name "$certificate_name")"
    matches="$(printf '%s\n' "$identities" | grep -F "$normalized_name" | grep -F 'Developer ID Application:' || true)"
  fi

  if [ -z "$matches" ]; then
    print_fail "CSC_NAME was not found in Keychain: $certificate_name"
    return
  fi

  if [ "$(count_non_empty_lines "$matches")" -gt 1 ]; then
    print_warn 'CSC_NAME matches multiple Developer ID certificates, prefer the full certificate name with prefix'
    printf '%s\n' "$matches"
  else
    print_ok "Found signing identity for CSC_NAME: $certificate_name"
  fi
}

check_notarization_auth() {
  if [ -n "${APPLE_ID:-}" ] && [ -n "${APPLE_TEAM_ID:-}" ] && [ -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" ]; then
    print_ok 'Using Apple ID + app-specific password for notarization'
    return
  fi

  if [ -n "${APPLE_API_KEY:-}" ] && [ -n "${APPLE_API_KEY_ID:-}" ] && [ -n "${APPLE_API_ISSUER:-}" ]; then
    print_ok 'Using App Store Connect API key variables for notarization'
    return
  fi

  if [ -n "${APPLE_ID:-}" ] || [ -n "${APPLE_TEAM_ID:-}" ] || [ -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" ]; then
    print_fail 'Incomplete Apple ID notarization credentials: set APPLE_ID + APPLE_TEAM_ID + APPLE_APP_SPECIFIC_PASSWORD'
    return
  fi

  if [ -n "${APPLE_API_KEY:-}" ] || [ -n "${APPLE_API_KEY_ID:-}" ] || [ -n "${APPLE_API_ISSUER:-}" ]; then
    print_fail 'Incomplete App Store Connect API key credentials: set APPLE_API_KEY + APPLE_API_KEY_ID + APPLE_API_ISSUER'
    return
  fi

  print_fail 'Missing notarization credentials: set Apple ID credentials or App Store Connect API key credentials'
  print_warn 'Copy .envrc.example to .envrc.local and fill in one notarization method before running build:mac:web'
}

printf 'Checking macOS signing and notarization prerequisites...\n'

check_command security
check_command xcrun
check_certificate
check_notarization_auth
check_optional_env APPLE_API_KEY
check_optional_env APPLE_API_KEY_ID
check_optional_env APPLE_API_ISSUER
check_optional_env APPLE_ID
check_optional_env APPLE_TEAM_ID
check_optional_env APPLE_APP_SPECIFIC_PASSWORD

if [ "$failures" -gt 0 ]; then
  printf '\nNotarization check failed with %s issue(s).\n' "$failures"
  exit 1
fi

printf '\nNotarization check passed.\n'
