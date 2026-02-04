#!/usr/bin/env bash

# ============================================================================
# SEEDBAY QUICK START - Setup & Deployment
# ============================================================================

set -euo pipefail
trap 'echo -e "${RED}❌ Setup failed at line $LINENO${NC}"; exit 1' ERR

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 SEEDBAY QUICK START${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Install dependencies
echo -e "${BLUE}Step 1: Installing npm dependencies...${NC}"
npm install

echo ""
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 2: Build
echo -e "${BLUE}Step 2: Building Next.js project...${NC}"
npm run build

if [ ! -d ".next" ]; then
  echo -e "${RED}✗ Build failed: .next directory not found${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Step 3: Environment setup
echo -e "${BLUE}Step 3: Environment Configuration${NC}"
echo ""

if [ ! -f ".env.production.local" ]; then
  echo -e "${YELLOW}ℹ️  Create .env.production.local with:${NC}"
  echo ""
  cat .env.production.example
  echo ""
  read -p "Press Enter when ready..."
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ SEEDBAY IS READY FOR DEPLOYMENT!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

echo "Next steps:"
echo ""
echo "📋 For LOCAL TESTING:"
echo "   npm run dev"
echo "   → Open http://localhost:3000"
echo ""
echo "🚀 For VERCEL DEPLOYMENT:"
echo "   1. git add . && git commit -m 'Initial commit'"
echo "   2. git push origin main"
echo "   3. Import on https://vercel.com"
echo "   4. Set environment variables in Vercel dashboard"
echo "   5. Vercel deploys automatically!"
echo ""
echo "📚 DOCUMENTATION:"
echo "   - 00-START-HERE.md"
echo "   - SEEDBAY-README.md"
echo "   - seedbay-deployment-guide.ts"
echo ""
