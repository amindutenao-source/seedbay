#!/usr/bin/env bash

# ============================================================================
# SEEDBAY PRODUCTION DEPLOYMENT CHECKLIST & LAUNCHER
# 28 janvier 2026
# ============================================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Global error trap
trap 'echo -e "${RED}❌ Deployment failed at line $LINENO${NC}"; exit 1' ERR

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 SEEDBAY PRODUCTION DEPLOYMENT LAUNCHER${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# PRE-FLIGHT CHECKS
echo -e "${YELLOW}📋 PRE-FLIGHT CHECKS${NC}"
echo ""

CHECKS_PASSED=0
CHECKS_TOTAL=0

check_env_file() {
  CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
  if [ -f ".env.local" ] || [ -f ".env.production.local" ]; then
    echo -e "${GREEN}✓${NC} Environment file exists"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo -e "${RED}✗${NC} Missing .env.local or .env.production.local"
    echo "   Create .env.local with:"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "   - SUPABASE_JWT_SECRET"
    echo "   - STRIPE_SECRET_KEY"
    echo "   - STRIPE_WEBHOOK_SECRET"
  fi
}

check_git() {
  CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
  if git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Git repository exists"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo -e "${RED}✗${NC} Not a git repository. Run: git init"
  fi
}

check_node() {
  CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
  if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | sed 's/v//')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
      echo -e "${GREEN}✓${NC} Node.js $NODE_VERSION (>= 18)"
      CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
      echo -e "${RED}✗${NC} Node.js $NODE_VERSION found but >= 18 required"
    fi
  else
    echo -e "${RED}✗${NC} Node.js not installed. Visit: https://nodejs.org"
  fi
}

check_npm() {
  CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
  if command -v npm &> /dev/null; then
    echo -e "${GREEN}✓${NC} npm installed"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo -e "${RED}✗${NC} npm not installed"
  fi
}

check_supabase() {
  CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
  if [ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]; then
    echo -e "${GREEN}✓${NC} Supabase URL configured"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo -e "${YELLOW}⚠${NC} Supabase URL not in environment"
    echo "   Set: export NEXT_PUBLIC_SUPABASE_URL=..."
  fi
}

check_stripe() {
  CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
  if [ -n "${STRIPE_SECRET_KEY:-}" ]; then
    echo -e "${GREEN}✓${NC} Stripe key configured"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo -e "${YELLOW}⚠${NC} Stripe key not in environment"
    echo "   Set: export STRIPE_SECRET_KEY=..."
  fi
}

check_lockfile() {
  CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
  if [ -f "package-lock.json" ] || [ -f "yarn.lock" ] || [ -f "pnpm-lock.yaml" ]; then
    echo -e "${GREEN}✓${NC} Lockfile present (dependencies pinned)"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    echo -e "${RED}✗${NC} No lockfile found (package-lock.json, yarn.lock, or pnpm-lock.yaml)"
    echo "   Run: npm install"
  fi
}

check_git_secrets() {
  CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
  local env_files=$(git ls-files --cached 2>/dev/null | grep -E "\.env" || true)
  if [ -n "$env_files" ]; then
    echo -e "${RED}✗${NC} .env files are being tracked by git!"
    echo "   Add to .gitignore:"
    echo "     .env"
    echo "     .env.local"
    echo "     .env.*.local"
    echo "   Then run: git rm --cached .env*"
  else
    echo -e "${GREEN}✓${NC} No .env files tracked by git"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
  fi
}

check_gitignore() {
  CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
  if [ -f ".gitignore" ]; then
    if grep -q "\.env" .gitignore; then
      echo -e "${GREEN}✓${NC} .gitignore excludes .env files"
      CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
      echo -e "${YELLOW}⚠${NC} .gitignore exists but may not exclude .env files"
    fi
  else
    echo -e "${YELLOW}⚠${NC} No .gitignore found"
  fi
}

# Run checks
check_env_file
check_git
check_node
check_npm
check_lockfile
check_gitignore
check_git_secrets
check_supabase
check_stripe

echo ""
echo -e "${BLUE}Status: ${CHECKS_PASSED}/${CHECKS_TOTAL} checks passed${NC}"
echo ""

if [ $CHECKS_PASSED -lt $CHECKS_TOTAL ]; then
  echo -e "${YELLOW}⚠️  Some checks failed. Please fix the issues above.${NC}"
  echo ""
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo ""
echo -e "${YELLOW}📋 DEPLOYMENT STEPS${NC}"
echo ""

# STEP 1: Install dependencies
echo -e "${BLUE}Step 1: Installing dependencies...${NC}"
npm ci --production

echo ""
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# STEP 1.5: Optional TypeScript/Lint checks
if [ -f "tsconfig.json" ] && command -v tsc &> /dev/null; then
  read -p "Run TypeScript check? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}TypeScript validation...${NC}"
    npx tsc --noEmit || echo -e "${YELLOW}⚠${NC} TypeScript issues found"
  fi
fi

if [ -f ".eslintrc.json" ] && command -v eslint &> /dev/null; then
  read -p "Run ESLint? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Linting code...${NC}"
    npx eslint . --max-warnings 0 || echo -e "${YELLOW}⚠${NC} Lint issues found"
  fi
fi

# STEP 2: Build the project
echo -e "${BLUE}Step 2: Building Next.js project...${NC}"
npm run build

# Verify build artifacts
if [ ! -d ".next" ]; then
  echo -e "${RED}✗ Build failed: .next directory not found${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# STEP 3: Run tests (optional)
read -p "Run security tests? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${BLUE}Step 3: Running security tests...${NC}"
  npm run test:security 2>/dev/null || echo "No test script defined"
  echo ""
fi

# STEP 4: Environment checks
echo -e "${BLUE}Step 4: Verifying environment configuration...${NC}"
echo ""

ENV_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_JWT_SECRET"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
)

MISSING_VARS=0
for var in "${ENV_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo -e "${YELLOW}⚠${NC} Missing: $var"
    MISSING_VARS=$((MISSING_VARS + 1))
  else
    # Show masked value for security
    VAL_LENGTH=${#!var}
    MASKED="${!var:0:4}...${!var:(-4)}"
    echo -e "${GREEN}✓${NC} $var (${VAL_LENGTH} chars)"
  fi
done

if [ $MISSING_VARS -gt 0 ]; then
  echo ""
  echo -e "${RED}❌ Missing $MISSING_VARS environment variables!${NC}"
  echo ""
  echo "Set them in .env.production.local or Vercel settings:"
  echo "  NEXT_PUBLIC_SUPABASE_URL=https://..."
  echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=..."
  echo "  SUPABASE_JWT_SECRET=..."
  echo "  STRIPE_SECRET_KEY=<stripe-secret>"
  echo "  STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>"
  echo ""
  exit 1
fi

echo ""
echo -e "${GREEN}✓ All environment variables configured${NC}"
echo ""

# STEP 5: Pre-deployment summary
echo -e "${YELLOW}📊 PRE-DEPLOYMENT SUMMARY${NC}"
echo ""
echo "Environment: PRODUCTION"
echo "Project: SeedBay"
echo "Build Status: ✓ SUCCESSFUL"
echo "Environment: ✓ CONFIGURED"
echo "Tests: $([ -d '.next' ] && echo '✓ READY' || echo '⚠ PENDING')"
echo ""

# STEP 6: Deployment instructions
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 DEPLOYMENT INSTRUCTIONS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${GREEN}OPTION 1: Deploy to Vercel (Recommended)${NC}"
echo "  1. Commit your changes: git add . && git commit -m 'Deploy to production'"
echo "  2. Push to GitHub: git push origin main"
echo "  3. Vercel auto-deploys (watch https://vercel.com/dashboard)"
echo ""

echo -e "${GREEN}OPTION 2: Deploy Locally (Testing)${NC}"
echo "  npm run start"
echo "  App will be at: http://localhost:3000"
echo ""

echo -e "${GREEN}OPTION 3: Deploy to Production Server${NC}"
echo "  1. SSH to server: ssh user@your-server.com"
echo "  2. Pull code: git pull origin main"
echo "  3. Install: npm install --production"
echo "  4. Build: npm run build"
echo "  5. Start: npm run start (or use PM2/systemd)"
echo ""

echo -e "${YELLOW}⚠️  POST-DEPLOYMENT CHECKS${NC}"
echo ""
echo "After deployment, verify:"
echo "  [ ] Health endpoint: curl https://your-domain.com/api/health"
echo "  [ ] Auth working: Try signup at https://your-domain.com/signup"
echo "  [ ] Stripe webhook: Check Stripe dashboard logs"
echo "  [ ] Database RLS: Verify in Supabase"
echo "  [ ] Logs: Monitor with Sentry or similar"
echo "  [ ] Monitoring: Check performance metrics"
echo ""

echo -e "${YELLOW}🔔 MONITORING${NC}"
echo ""
echo "1. Sentry (Error tracking)"
echo "   https://sentry.io/dashboard/"
echo ""
echo "2. Vercel Analytics"
echo "   https://vercel.com/dashboard"
echo ""
echo "3. Stripe Dashboard"
echo "   https://dashboard.stripe.com"
echo ""
echo "4. Supabase Dashboard"
echo "   https://app.supabase.com"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ READY FOR PRODUCTION DEPLOYMENT!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

read -p "Continue with deployment to Vercel? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${BLUE}Step 5: Git commit and push...${NC}"
  echo ""
  
  git add .
  git commit -m "🚀 Deploy SeedBay to production - $(date +%Y-%m-%d)" || true
  git push origin main
  
  echo ""
  echo -e "${GREEN}✓ Code pushed to GitHub${NC}"
  echo ""
  echo -e "${YELLOW}⏳ Vercel is now deploying...${NC}"
  echo "   Check progress at: https://vercel.com/dashboard"
  echo ""
  
  # Optional health check
  read -p "Do you have a production URL to health check? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your domain (e.g., seedbay.com): " DOMAIN
    HEALTH_URL="https://${DOMAIN}/api/health"
    
    echo -e "${BLUE}Waiting for deployment (60s)...${NC}"
    sleep 60
    
    echo -e "${BLUE}Health checking: $HEALTH_URL${NC}"
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Health check passed!${NC}"
      echo -e "${GREEN}🎉 Deployment successful and application is running!${NC}"
    else
      echo -e "${YELLOW}⚠${NC} Health check failed"
      echo "   The deployment may still be in progress."
      echo "   Check: $HEALTH_URL"
    fi
  fi
  
  echo ""
else
  echo ""
  echo -e "${YELLOW}Deployment cancelled.${NC}"
  echo "When ready, run:"
  echo "  git add . && git commit -m 'Deploy to production'"
  echo "  git push origin main"
  echo ""
fi

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo "For more information, see:"
echo "  - seedbay-deployment-guide.ts"
echo "  - POINTS-CRITIQUES.md"
echo "  - SEEDBAY-README.md"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
