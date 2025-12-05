#!/bin/bash

# Complete Vite Dev Server Reset Script
# This fixes aggressive caching issues

echo "=== Stopping all Vite processes ==="
pkill -9 -f "vite" 2>/dev/null || true
pkill -9 -f "node.*my-project" 2>/dev/null || true
sleep 2

echo "=== Removing all caches ==="
cd /home/sathish-r/Main-Peojects/Murugan-Bags/my-project
rm -rf node_modules/.vite
rm -rf .vite
rm -rf dist
sleep 1

echo "=== Starting fresh dev server ==="
npm run dev

echo ""
echo "✅ Dev server restarted!"
echo "👉 Now hard refresh your browser with Ctrl+Shift+R"
