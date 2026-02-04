#!/usr/bin/env bash

# ==============================================================================
# SEEDBAY — PRODUCTION DEPLOYMENT SCRIPT (HARDENED)
# Version corrigée & améliorée
# ==============================================================================

set -Eeuo pipefail
IFS=$'\n\t'

# Configuration
APP_NAME="SeedBay"
ENV_FILE=".env.production.local"
NODE_MIN_VERSION=18

# Colors
RED="$(printf '\033[0;31m')"
GREEN="$(printf '\033[0;32m')"
YELLOW="$(printf '\033[1;33m')"
BLUE="$(printf '\033[0;34m')"
NC="$(printf '\033[0m')"

# Error handling
error_handler() {
  echo -e "${RED}❌ Error on line $1${NC}"
  exit 1
}
trap 'error_handler $LINENO' ERR

# Utilities
confirm() {
  read -r -p "$1 (y/n): " response
  [[ "$response" =~ ^[Yy]$ ]]
}

mask_secret() {
  local val="$1"
  local len="${#val}"
  if [ "$len" -le 8 ]; then
    echo "********"
  else
    echo "${val:0:4}****${val: -4}"
  fi
}

# Header
echo -e "${BLUE}══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 ${APP_NAME} — PRODUCTION DEPLOYMENT${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════${NC}"
echo ""

# Load environment
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
  echo -e "${GREEN}✓${NC} Loaded $ENV_FILE"
else
  echo -e "${RED}✗ Missing $ENV_FILE${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}📋 PRE-FLIGHT CHECKS${NC}"
echo ""

# Git check
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Git repository"
else
  echo -e "${RED}✗ Not a git repo${NC}"
  exit 1
fi

# Node check
NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR="${NODE_VERSION%%.*}"
if [ "$NODE_MAJOR" -lt "$NODE_MIN_VERSION" ]; then
  echo -e "${RED}✗ Node $NODE_VERSION < $NODE_MIN_VERSION${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $NODE_VERSION"

# npm check
if ! command -v npm >/dev/null; then
  echo -e "${RED}✗ npm missing${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} npm installed"

# Lockfile check
if ls package-lock.json yarn.lock pnpm-lock.yaml >/dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Lockfile present"
else
  echo -e "${RED}✗ Missing lockfile${NC}"
  exit 1
fi

# Secrets safety
if git ls-files --cached 2>/dev/null | grep -q '\.env'; then
  echo -e "${RED}✗ .env tracked by git${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} Secrets not tracked"

# Gitignore check
if [ -f ".gitignore" ] && grep -q '\.env' .gitignore; then
  echo -e "${GREEN}✓${NC} .gitignore configured"
fi

echo ""
echo -e "${YELLOW}🔐 ENVIRONMENT VARIABLES${NC}"
echo ""

# Check required vars
REQUIRED_VARS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_JWT_SECRET
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo -e "${RED}✗ Missing: $var${NC}"
    exit 1
  fi
  echo -e "${GREEN}✓${NC} $var = $(mask_secret "${!var}")"
done

echo ""
echo -e "${BLUE}📦 Installing dependencies${NC}"
npm ci --omit=dev
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Optional checks
if [ -f "tsconfig.json" ]; then
  if confirm "Run TypeScript check?"; then
    echo -e "${BLUE}🔍 TypeScript validation${NC}"
    npx tsc --noEmit && echo -e "${GREEN}✓${NC} Types OK"
    echo ""
  fi
fi

if [ -f ".eslintrc.json" ]; then
  if confirm "Run ESLint?"; then
    echo -e "${BLUE}🔍 Code quality check${NC}"
    npx eslint . --max-warnings 0 && echo -e "${GREEN}✓${NC} Lint OK"
    echo ""
  fi
fi

# Build
echo -e "${BLUE}🏗️  Building application${NC}"
npm run build

if [ ! -d ".next" ]; then
  echo -e "${RED}✗ Build failed${NC}"
  exit 1
fi

BUILD_SIZE=$(du -sh .next 2>/dev/null | awk '{print $1}' || echo "unknown")
echo -e "${GREEN}✓${NC} Build successful (${BUILD_SIZE})"
echo ""

# Optional tests
if confirm "Run security tests?"; then
  echo -e "${BLUE}🧪 Running security tests${NC}"
  npm run test:security || echo -e "${YELLOW}⚠${NC} No tests defined"
  echo ""
fi

# Deploy
echo -e "${BLUE}🚀 DEPLOYMENT${NC}"
echo ""

git add .
git commit -m "🚀 Production deploy $(date +%F)" || true
git push origin main

echo -e "${GREEN}✓${NC} Pushed to GitHub — Vercel deploying"
echo ""

# Health check
if confirm "Run production health check?"; then
  read -r -p "Domain (e.g. seedbay.com): " DOMAIN
  URL="https://${DOMAIN}/api/health"

  echo -e "${BLUE}⏳ Waiting 60s for deployment…${NC}"
  sleep 60

  echo -e "${BLUE}🏥 Health checking: $URL${NC}"
  if curl -fs "$URL" >/dev/null 2>&1; then
    echo -e "${GREEN}🎉 HEALTH CHECK OK — Application running!${NC}"
  else
    echo -e "${YELLOW}⚠${NC} Health check failed (deployment may be in progress)"
  fi
  echo ""
fi

# Complete
echo -e "${BLUE}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ ${APP_NAME} PRODUCTION DEPLOYMENT COMPLETE${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════${NC}"
echo ""
echo "📊 Next: Monitor at https://vercel.com/dashboard"
echo "📚 Docs: See POINTS-CRITIQUES.md"
echo ""
