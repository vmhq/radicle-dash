#!/usr/bin/env bash
# radstack — one command to start/stop the whole local stack on M3:
#   rad node, radicle-httpd, Next.js personal + marketing, Instar, cloudflared.
#
# Usage:
#   radstack start              # start everything
#   radstack stop               # stop everything radstack started
#   radstack status             # show what's running
#   radstack logs <name>        # tail one service log
#
# Override paths if your layout differs (set in shell or before the command):
#   RADSTACK_DASHBOARD_DIR  default: $HOME/Documents/radicle/dashboard
#   RADSTACK_INSTAR_DIR     default: $HOME/Documents/instar
#   RADSTACK_TUNNEL         default: m3-laptop
#   RADSTACK_HTTPD_LISTEN   default: 0.0.0.0:8090

set -euo pipefail

LOG_DIR="$HOME/Library/Logs/radstack"
PID_DIR="$HOME/.radstack"
mkdir -p "$LOG_DIR" "$PID_DIR"

DASHBOARD_DIR="${RADSTACK_DASHBOARD_DIR:-$HOME/Documents/radicle/dashboard}"
INSTAR_DIR="${RADSTACK_INSTAR_DIR:-$HOME/Documents/instar}"
TUNNEL="${RADSTACK_TUNNEL:-m3-laptop}"
HTTPD_LISTEN="${RADSTACK_HTTPD_LISTEN:-0.0.0.0:8090}"

is_alive() {
  local pidfile="$1"
  [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null
}

start_one() {
  local name="$1" cmd="$2" workdir="${3:-$PWD}"
  local pidfile="$PID_DIR/$name.pid"
  local log="$LOG_DIR/$name.log"

  if is_alive "$pidfile"; then
    echo "  $name: already running (pid $(cat "$pidfile"))"
    return 0
  fi

  if [[ ! -d "$workdir" ]]; then
    echo "  $name: SKIP (working directory not found: $workdir)"
    return 0
  fi

  echo "  $name: starting → $log"
  (
    cd "$workdir"
    nohup bash -c "exec $cmd" >>"$log" 2>&1 &
    echo $! >"$pidfile"
  )
}

stop_one() {
  local name="$1"
  local pidfile="$PID_DIR/$name.pid"
  if is_alive "$pidfile"; then
    local pid; pid="$(cat "$pidfile")"
    echo "  $name: stopping (pid $pid)"
    kill "$pid" 2>/dev/null || true
    sleep 0.3
    kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
  else
    echo "  $name: not running"
  fi
  rm -f "$pidfile"
}

status_one() {
  local name="$1"
  local pidfile="$PID_DIR/$name.pid"
  if is_alive "$pidfile"; then
    echo "  $name: up   (pid $(cat "$pidfile"))   log: $LOG_DIR/$name.log"
  else
    echo "  $name: down"
  fi
}

cmd_start() {
  echo "Starting Radicle stack…"

  if command -v rad >/dev/null 2>&1; then
    echo "  rad node: ensuring daemon is running"
    rad node start >/dev/null 2>&1 || true
  else
    echo "  rad node: SKIP ('rad' not on PATH)"
  fi

  start_one httpd       "radicle-httpd --listen $HTTPD_LISTEN"
  start_one personal    "npm run start:personal"   "$DASHBOARD_DIR"
  start_one marketing   "npm run start:marketing"  "$DASHBOARD_DIR"
  # Instar uses its own ./instar launcher (sets WEB_UI_HOST/PORT, frees port 7430,
  # runs bun install, then execs bun run src/index.ts). Matches `instar` CLI.
  start_one instar      "env PATH=\"$HOME/.bun/bin:\$PATH\" bash ./instar" "$INSTAR_DIR"
  start_one cloudflared "env TUNNEL_TRANSPORT_PROTOCOL=http2 cloudflared tunnel run $TUNNEL"

  echo
  cmd_status
  echo
  echo "Logs:    $LOG_DIR"
  echo "Stop:    $0 stop"
  echo "Tail:    $0 logs <name>     (e.g. $0 logs cloudflared)"
}

cmd_stop() {
  echo "Stopping Radicle stack…"
  for n in cloudflared instar marketing personal httpd; do
    stop_one "$n"
  done
  if command -v rad >/dev/null 2>&1; then
    echo "  rad node: stopping"
    rad node stop >/dev/null 2>&1 || true
  fi
}

cmd_status() {
  echo "Status:"
  for n in httpd personal marketing instar cloudflared; do
    status_one "$n"
  done
  if command -v rad >/dev/null 2>&1; then
    if rad node status 2>/dev/null | grep -qi running; then
      echo "  rad node:    up"
    else
      echo "  rad node:    down"
    fi
  fi
}

cmd_logs() {
  local name="${1:-}"
  if [[ -z "$name" ]]; then
    echo "Usage: $0 logs <name>"
    echo "  Available: httpd, personal, marketing, instar, cloudflared"
    exit 2
  fi
  local log="$LOG_DIR/$name.log"
  if [[ ! -f "$log" ]]; then
    echo "No log yet at $log"
    exit 1
  fi
  exec tail -F "$log"
}

case "${1:-}" in
  start)  cmd_start ;;
  stop)   cmd_stop ;;
  status) cmd_status ;;
  logs)   shift; cmd_logs "$@" ;;
  ""|help|-h|--help)
    cat <<EOF
radstack — start/stop the local Radicle + Instar + tunnel stack.

Commands:
  start             start node, httpd, both Next.js sites, Instar, cloudflared
  stop              stop everything radstack started
  status            show what's running
  logs <name>       tail a service log
                    names: httpd, personal, marketing, instar, cloudflared

Env overrides (set before the command if needed):
  RADSTACK_DASHBOARD_DIR   (default: \$HOME/Documents/radicle/dashboard)
  RADSTACK_INSTAR_DIR      (default: \$HOME/Documents/instar)
  RADSTACK_TUNNEL          (default: m3-laptop)
  RADSTACK_HTTPD_LISTEN    (default: 0.0.0.0:8090)
EOF
    ;;
  *)
    echo "Unknown command: $1" >&2
    exit 2 ;;
esac
