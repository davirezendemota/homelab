#!/bin/sh
set -e
cd /app

STAMP="node_modules/.deps-stamp"

needs_install() {
  if [ ! -f package-lock.json ]; then
    return 1
  fi
  if [ ! -d node_modules/@tailwindcss/postcss ]; then
    return 0
  fi
  if [ ! -f node_modules/next/package.json ]; then
    return 0
  fi
  if [ ! -f "$STAMP" ]; then
    return 0
  fi
  if [ package-lock.json -nt "$STAMP" ]; then
    return 0
  fi
  return 1
}

if needs_install; then
  echo "[entrypoint] Sincronizando node_modules com package-lock.json..."
  npm ci
  touch "$STAMP"
fi

exec "$@"
