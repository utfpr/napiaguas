#!/bin/sh
set -euo pipefail

WEB_PORT="${WEB_PORT:-5173}"

node <<'NODE'
const fs = require('node:fs')
const path = require('node:path')

const env = {
  VITE_API_URL:
    process.env.VITE_API_URL || 'https://api.napiaguas.com.br',
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || '',
  VITE_APP_NAME: process.env.VITE_APP_NAME || 'NAPI Águas - Paraná',
  VITE_ENABLE_ANALYTICS:
    process.env.VITE_ENABLE_ANALYTICS ?? 'true',
}

const target = path.join('/app', 'dist', 'env-config.js')
const payload = `window.__ENV__ = ${JSON.stringify(env)};\n`
fs.writeFileSync(target, payload, 'utf-8')
NODE

exec serve -s dist -l "$WEB_PORT"
