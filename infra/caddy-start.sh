#!/bin/bash
# Start Caddy with the repo Caddyfile.
# Usage: infra/caddy-start.sh

set -e

CONFIG="$(cd "$(dirname "$0")" && pwd)/Caddyfile"

if ! command -v caddy >/dev/null 2>&1; then
  echo "caddy not found. Install with: brew install caddy" >&2
  exit 1
fi

echo "Validating Caddyfile…"
caddy validate --config "$CONFIG"

echo ""
echo "Starting Caddy with $CONFIG"
echo "Press Ctrl+C to stop."
exec caddy run --config "$CONFIG"
