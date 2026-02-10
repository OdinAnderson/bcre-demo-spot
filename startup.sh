#!/bin/bash
# startup.sh — Azure App Service custom startup script
# Installs Chrome dependencies needed by Puppeteer, then starts the app.

set -e

echo "=== Installing Chrome dependencies for Puppeteer ==="
apt-get update -qq && apt-get install -y -qq --no-install-recommends \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2 \
  libatspi2.0-0 \
  libnspr4 \
  libnss3 \
  libxss1 \
  libxkbcommon0 \
  libxfixes3 \
  libwayland-client0 \
  fonts-liberation \
  > /dev/null 2>&1 || echo "Warning: some Chrome deps may have failed (non-fatal)"

echo "=== Starting BCRE Demo Spot ==="
node server.js
