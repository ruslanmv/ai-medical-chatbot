#!/bin/bash
# ============================================================
# deploy-hf.sh — Zero-duplication HuggingFace Space deployer
#
# Assembles a complete Next.js app from:
#   web/                    → frontend (single source of truth)
#   9-HuggingFace-Global/   → backend (API routes, DB, safety, RAG)
#
# Rewrites /api/proxy/ → /api/ and force-pushes to HF Space.
#
# Usage:
#   HF_TOKEN=hf_xxx bash 9-HuggingFace-Global/scripts/deploy-hf.sh
# ============================================================

set -e

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HF_DIR="$REPO_ROOT/9-HuggingFace-Global"
WEB_DIR="$REPO_ROOT/web"
BUILD_DIR="/tmp/medos-hf-deploy"

if [ -z "$HF_TOKEN" ]; then
  echo "ERROR: Set HF_TOKEN environment variable" && exit 1
fi
if [ ! -d "$WEB_DIR" ]; then
  echo "ERROR: web/ not found at $WEB_DIR" && exit 1
fi

echo "[deploy] Assembling from web/ + 9-HuggingFace-Global/..."
rm -rf "$BUILD_DIR" && mkdir -p "$BUILD_DIR"

# --- Step 1: Start with HF backend as the base ---
# This brings Dockerfile, package.json, next.config.js, tsconfig,
# all /app/api routes, /app/admin, /app/symptoms, /app/stats,
# lib/db, lib/safety, lib/rag, lib/providers, data/, public/, etc.
cp -r "$HF_DIR/"* "$BUILD_DIR/"
cp "$HF_DIR/.gitignore" "$BUILD_DIR/" 2>/dev/null || true
cp "$HF_DIR/.env.example" "$BUILD_DIR/" 2>/dev/null || true
rm -f "$BUILD_DIR/tsconfig.tsbuildinfo"

# --- Step 2: Overlay web/ frontend (source of truth) ---
# Components
for dir in views chat ui; do
  rm -rf "$BUILD_DIR/components/$dir"
  mkdir -p "$BUILD_DIR/components/$dir"
  cp -r "$WEB_DIR/components/$dir/"* "$BUILD_DIR/components/$dir/" 2>/dev/null || true
done

# Root components
for f in MedOSApp.tsx ThemeProvider.tsx ThemeToggle.tsx WelcomeScreen.tsx; do
  [ -f "$WEB_DIR/components/$f" ] && cp "$WEB_DIR/components/$f" "$BUILD_DIR/components/"
done

# Hooks
mkdir -p "$BUILD_DIR/lib/hooks"
for f in useChat.ts useSettings.ts useAuth.ts useHealthStore.ts useNotifications.ts useGeoDetect.ts useMedicineScanner.ts; do
  [ -f "$WEB_DIR/lib/hooks/$f" ] && cp "$WEB_DIR/lib/hooks/$f" "$BUILD_DIR/lib/hooks/"
done

# Shared libs
for f in health-store.ts i18n.ts types.ts utils.ts; do
  [ -f "$WEB_DIR/lib/$f" ] && cp "$WEB_DIR/lib/$f" "$BUILD_DIR/lib/"
done

# Styles + config
cp "$WEB_DIR/app/globals.css" "$BUILD_DIR/app/"
cp "$WEB_DIR/app/layout.tsx" "$BUILD_DIR/app/"
cp "$WEB_DIR/tailwind.config.ts" "$BUILD_DIR/"
[ -f "$WEB_DIR/app/icon.svg" ] && cp "$WEB_DIR/app/icon.svg" "$BUILD_DIR/app/"
[ -f "$WEB_DIR/app/manifest.ts" ] && cp "$WEB_DIR/app/manifest.ts" "$BUILD_DIR/app/"

# Page shell
cat > "$BUILD_DIR/app/page.tsx" << 'EOF'
import MedOSApp from "@/components/MedOSApp";
export default function HomePage() { return <MedOSApp />; }
EOF

# Remove Vercel-only proxy route if it leaked in
rm -rf "$BUILD_DIR/app/api/proxy" 2>/dev/null || true

# --- Step 3: Rewrite /api/proxy/ → /api/ ---
echo "[deploy] Rewriting API paths..."
find "$BUILD_DIR/lib/hooks" "$BUILD_DIR/components" \
  \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | while read f; do
  sed -i 's|/api/proxy/|/api/|g' "$f"
done

# --- Step 4: Push to HuggingFace ---
echo "[deploy] Pushing to HuggingFace Space..."
cd "$BUILD_DIR"
git init && git branch -M main
git add -A
git -c commit.gpgsign=false commit -m "Deploy: web/ frontend + HF backend (zero duplication)"
git remote add hf "https://ruslanmv:${HF_TOKEN}@huggingface.co/spaces/ruslanmv/MediBot"
git push hf main --force 2>&1 | tail -5

echo "[deploy] ✓ Done — https://huggingface.co/spaces/ruslanmv/MediBot"
