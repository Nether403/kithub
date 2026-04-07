#!/bin/bash
set -e

echo "=== Post-merge setup ==="

echo "Installing dependencies..."
npm install --no-audit --no-fund 2>&1 | tail -5

echo "Pushing DB schema..."
cd packages/db
npx drizzle-kit push:pg 2>&1 | tail -10
cd ../..

echo "=== Post-merge setup complete ==="
