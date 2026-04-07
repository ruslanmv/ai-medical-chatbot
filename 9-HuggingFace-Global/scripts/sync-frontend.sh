#!/bin/bash
# ============================================================
# sync-frontend.sh — Enterprise single-source-of-truth builder
#
# Copies web/ frontend into 9-HuggingFace-Global/ and rewrites
# /api/proxy/* → /api/* for same-origin.
#
# Run this BEFORE deploying to HF Space:
#   cd ai-medical-chatbot
#   bash 9-HuggingFace-Global/scripts/sync-frontend.sh
#   # then push 9-HuggingFace-Global/ to HF
#
# web/ is the SINGLE SOURCE OF TRUTH for all frontend code.
# ============================================================

set -e

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HF_DIR="$REPO_ROOT/9-HuggingFace-Global"
WEB_DIR="$REPO_ROOT/web"

if [ ! -d "$WEB_DIR" ]; then
  echo "[sync] ERROR: web/ not found at $WEB_DIR"
  exit 1
fi

echo "[sync] Source: $WEB_DIR"
echo "[sync] Target: $HF_DIR"

# 1. Components
rm -rf "$HF_DIR/components/views/"* "$HF_DIR/components/chat/"* "$HF_DIR/components/ui/"*
mkdir -p "$HF_DIR/components/views" "$HF_DIR/components/chat" "$HF_DIR/components/ui"

cp -r "$WEB_DIR/components/views/"* "$HF_DIR/components/views/"
cp -r "$WEB_DIR/components/chat/"* "$HF_DIR/components/chat/"
cp -r "$WEB_DIR/components/ui/"* "$HF_DIR/components/ui/"
cp "$WEB_DIR/components/MedOSApp.tsx" "$HF_DIR/components/"
cp "$WEB_DIR/components/ThemeProvider.tsx" "$HF_DIR/components/"
cp "$WEB_DIR/components/ThemeToggle.tsx" "$HF_DIR/components/"
cp "$WEB_DIR/components/WelcomeScreen.tsx" "$HF_DIR/components/" 2>/dev/null || true

# 2. Hooks
mkdir -p "$HF_DIR/lib/hooks"
for f in useChat.ts useSettings.ts useAuth.ts useHealthStore.ts useNotifications.ts useGeoDetect.ts; do
  cp "$WEB_DIR/lib/hooks/$f" "$HF_DIR/lib/hooks/" 2>/dev/null || true
done

# 3. Shared libs
for f in health-store.ts i18n.ts types.ts utils.ts; do
  cp "$WEB_DIR/lib/$f" "$HF_DIR/lib/" 2>/dev/null || true
done

# 4. Styles + config
cp "$WEB_DIR/app/globals.css" "$HF_DIR/app/"
cp "$WEB_DIR/tailwind.config.ts" "$HF_DIR/"
cp "$WEB_DIR/app/icon.svg" "$HF_DIR/app/" 2>/dev/null || true
cp "$WEB_DIR/app/manifest.ts" "$HF_DIR/app/" 2>/dev/null || true
cp "$WEB_DIR/app/layout.tsx" "$HF_DIR/app/"

# 5. Page shell
cat > "$HF_DIR/app/page.tsx" << 'EOF'
import MedOSApp from "@/components/MedOSApp";
export default function HomePage() { return <MedOSApp />; }
EOF

# 6. Path rewrite: /api/proxy/* → /api/*
echo "[sync] Rewriting API paths for same-origin..."
find "$HF_DIR/lib/hooks" "$HF_DIR/components" -name "*.ts" -o -name "*.tsx" | while read f; do
  sed -i 's|/api/proxy/|/api/|g' "$f"
done

VIEWS=$(ls "$HF_DIR/components/views/" | wc -l)
echo "[sync] ✓ Done: $VIEWS views synced, API paths rewritten"
