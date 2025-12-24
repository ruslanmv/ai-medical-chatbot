# MedOS Testing & Verification Guide

This guide covers testing, verification, and quality assurance for the MedOS web application.

## Quick Test

```bash
# From the web directory
npm run verify
```

This runs a comprehensive verification script that checks:
- ✓ Required files exist
- ✓ Dependencies are correct
- ✓ Configuration is valid
- ✓ TypeScript setup
- ✓ Provider implementations
- ✓ Security headers

## Test Suite

### Install Test Dependencies

```bash
npm install
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Test Coverage

Our test suite includes:

1. **Type Tests** (`__tests__/lib/types.test.ts`)
   - Provider configuration validation
   - Type definitions
   - Model configurations

2. **Utility Tests** (`__tests__/lib/utils.test.ts`)
   - Timestamp formatting
   - Class name utilities
   - Helper functions

3. **Provider Tests** (`__tests__/api/providers.test.ts`)
   - Provider integration
   - Error handling
   - API key validation

## Verification Scripts

### 1. Deployment Verification

```bash
npm run verify
```

Checks:
- File structure
- Dependencies
- Configuration files
- TypeScript setup
- Provider implementations
- Security configuration

**Expected Output:**
```
✓ Passed: 26
🎉 All checks passed! Your application is ready for Vercel deployment.
```

### 2. Demo Script

```bash
node scripts/demo.js
```

Shows:
- Application overview
- Getting started guide
- Feature demonstrations
- API examples
- Deployment instructions
- Pro tips

## Pre-Deployment Checklist

Before deploying to Vercel, run:

```bash
# 1. Type checking
npm run type-check

# 2. Linting
npm run lint

# 3. Build test
npm run build

# 4. Full verification
npm run check-all
```

### Expected Results

✅ **Type Check**: No TypeScript errors
✅ **Lint**: No ESLint warnings
✅ **Build**: Successful production build
✅ **Verification**: All 26 checks passed

## Local Testing

### 1. Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

### 2. Test Core Features

#### Settings Configuration
1. Navigate to Settings
2. Select a provider (e.g., OpenAI)
3. Enter test API key: `sk-test123` (should fail validation)
4. Click "Verify Connection"
5. Expected: Error message about invalid key

#### Chat Interface
1. Configure valid API key in Settings
2. Navigate to Chat
3. Send message: "Hello"
4. Expected: Streaming response from AI

#### UI Navigation
- ✓ Sidebar navigation works
- ✓ All views load correctly
- ✓ Right panel displays vitals
- ✓ Mobile responsive

### 3. Browser Console Check

Open DevTools (F12) and check:
- ✓ No console errors
- ✓ localStorage has settings
- ✓ Network tab shows SSE connection for chat

## Production Build Test

```bash
# Build for production
npm run build

# Start production server
npm run start
```

Visit: http://localhost:3000

Verify:
- ✓ All pages load
- ✓ Chat streaming works
- ✓ Settings save/load
- ✓ No console errors

## Vercel Deployment Test

### 1. Deploy to Vercel Preview

```bash
vercel
```

### 2. Test Preview Deployment

Visit the preview URL provided by Vercel.

Check:
- ✓ Homepage loads
- ✓ Settings page works
- ✓ Chat streams responses
- ✓ API routes respond correctly
- ✓ No 500 errors in Vercel logs

### 3. Common Issues & Solutions

#### Build Fails

**Error**: `Cannot find module`
```bash
# Solution: Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Error**: TypeScript errors
```bash
# Solution: Check types
npm run type-check
# Fix errors in reported files
```

#### Streaming Not Working

**Issue**: Chat doesn't stream responses

**Debug**:
1. Open Network tab in DevTools
2. Send a chat message
3. Check for `/api/chat` request
4. Verify `Content-Type: text/event-stream`

**Solution**: Ensure `vercel.json` has correct function config

#### API Key Issues

**Issue**: "Invalid API key" errors

**Check**:
1. Settings → Verify API key format
2. Console logs for actual error
3. Provider-specific key format:
   - OpenAI: `sk-...`
   - Gemini: `AI...`
   - Claude: `sk-ant-...`

## Performance Testing

### Lighthouse Audit

```bash
# Build and start
npm run build && npm run start

# Open in Chrome
# DevTools → Lighthouse → Run Audit
```

**Expected Scores**:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+

### Network Testing

Check in DevTools Network tab:
- ✓ Initial page load < 2s
- ✓ First token from API < 1s
- ✓ Total bundle size < 500KB
- ✓ Images optimized

## Security Testing

### 1. Headers Check

Visit: https://securityheaders.com

Test your deployed URL. Expected:
- ✓ HSTS enabled
- ✓ X-Content-Type-Options
- ✓ X-Frame-Options

### 2. API Security

Test unauthorized access:
```bash
# Should return 400 with missing apiKey
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"provider":"openai","messages":[]}'
```

### 3. Client-Side Security

Check in DevTools:
- ✓ API keys only in localStorage
- ✓ No keys in console logs
- ✓ No keys in network requests logs
- ✓ HTTPS enforced

## Continuous Integration

For CI/CD pipelines, use:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: |
    cd web
    npm install
    npm run test
    npm run type-check
    npm run lint
    npm run build
```

## Troubleshooting

### Tests Failing

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm test
```

### Build Failing Locally But Passing on Vercel

- Check Node.js version: `node -v`
- Vercel uses 18.x by default
- Update local Node if needed

### Streaming Not Working in Production

1. Check Vercel Function logs
2. Verify `maxDuration` in `vercel.json`
3. Ensure provider SDK versions match

## Getting Help

If tests fail or deployment has issues:

1. Check `npm run verify` output
2. Review Vercel deployment logs
3. Open GitHub issue with:
   - Error message
   - `npm run verify` output
   - Build logs (if applicable)

## Summary

✅ **Before every commit**: `npm run type-check && npm run lint`
✅ **Before deployment**: `npm run check-all && npm run verify`
✅ **After deployment**: Test on preview URL
✅ **In production**: Monitor Vercel analytics and logs

---

**All tests passing?** You're ready to deploy! 🚀
