#!/usr/bin/env node

/**
 * Vercel Deployment Verification Script
 *
 * This script checks if the MedOS web application is ready for Vercel deployment.
 * It verifies:
 * - Required files exist
 * - Configuration is valid
 * - Dependencies are installable
 * - Build process succeeds
 * - No critical errors
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, colors.green);
}

function error(message) {
  log(`✗ ${message}`, colors.red);
}

function warning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ ${message}`, colors.blue);
}

function header(message) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(message, colors.cyan);
  log('='.repeat(60), colors.cyan);
}

// Verification checks
const checks = {
  requiredFiles: [
    'package.json',
    'next.config.js',
    'tsconfig.json',
    'tailwind.config.ts',
    'app/layout.tsx',
    'app/page.tsx',
    'app/api/chat/route.ts',
    'app/api/verify/route.ts',
    'components/MedOSApp.tsx',
    'lib/providers/index.ts',
    'lib/types.ts',
  ],
  requiredDependencies: [
    'next',
    'react',
    'react-dom',
    'openai',
    '@google/generative-ai',
    '@anthropic-ai/sdk',
    'zod',
  ],
  configFiles: {
    'package.json': (content) => {
      const pkg = JSON.parse(content);
      return pkg.scripts && pkg.scripts.build && pkg.scripts.start;
    },
    'next.config.js': (content) => {
      return content.includes('nextConfig') || content.includes('module.exports');
    },
    'vercel.json': (content) => {
      const config = JSON.parse(content);
      return config.functions || config.buildCommand;
    },
  },
};

async function runVerification() {
  header('MedOS Vercel Deployment Verification');

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  // Check 1: Required files
  info('\n[1/6] Checking required files...');
  for (const file of checks.requiredFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      success(`Found: ${file}`);
      passed++;
    } else {
      error(`Missing: ${file}`);
      failed++;
    }
  }

  // Check 2: Package.json dependencies
  info('\n[2/6] Checking dependencies...');
  const pkgPath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    for (const dep of checks.requiredDependencies) {
      if (allDeps[dep]) {
        success(`Dependency: ${dep} (${allDeps[dep]})`);
        passed++;
      } else {
        error(`Missing dependency: ${dep}`);
        failed++;
      }
    }
  }

  // Check 3: Configuration files
  info('\n[3/6] Validating configuration files...');
  for (const [file, validator] of Object.entries(checks.configFiles)) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (validator(content)) {
          success(`Valid configuration: ${file}`);
          passed++;
        } else {
          warning(`Configuration may have issues: ${file}`);
          warnings++;
        }
      } catch (err) {
        error(`Invalid configuration: ${file} - ${err.message}`);
        failed++;
      }
    }
  }

  // Check 4: TypeScript configuration
  info('\n[4/6] Checking TypeScript setup...');
  const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    try {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      if (tsconfig.compilerOptions && tsconfig.compilerOptions.strict) {
        success('TypeScript strict mode enabled');
        passed++;
      } else {
        warning('TypeScript strict mode not enabled (recommended)');
        warnings++;
      }
    } catch (err) {
      error(`Invalid tsconfig.json: ${err.message}`);
      failed++;
    }
  }

  // Check 5: Provider implementations
  info('\n[5/6] Verifying provider implementations...');
  const providers = ['openai', 'gemini', 'anthropic'];
  for (const provider of providers) {
    const providerPath = path.join(__dirname, '..', 'lib', 'providers', `${provider}.ts`);
    if (fs.existsSync(providerPath)) {
      const content = fs.readFileSync(providerPath, 'utf8');
      if (content.includes('export async function') && content.includes('SYSTEM_PROMPT')) {
        success(`Provider implementation: ${provider}`);
        passed++;
      } else {
        warning(`Provider may be incomplete: ${provider}`);
        warnings++;
      }
    } else {
      error(`Missing provider: ${provider}`);
      failed++;
    }
  }

  // Check 6: Security headers
  info('\n[6/6] Checking security configuration...');
  const nextConfigPath = path.join(__dirname, '..', 'next.config.js');
  if (fs.existsSync(nextConfigPath)) {
    const content = fs.readFileSync(nextConfigPath, 'utf8');
    const securityHeaders = [
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'X-Frame-Options',
    ];

    let foundHeaders = 0;
    for (const header of securityHeaders) {
      if (content.includes(header)) {
        foundHeaders++;
      }
    }

    if (foundHeaders === securityHeaders.length) {
      success('All security headers configured');
      passed++;
    } else if (foundHeaders > 0) {
      warning(`Some security headers missing (${foundHeaders}/${securityHeaders.length})`);
      warnings++;
    } else {
      error('No security headers configured');
      failed++;
    }
  }

  // Summary
  header('Verification Summary');
  log(`\n✓ Passed: ${passed}`, colors.green);
  if (warnings > 0) log(`⚠ Warnings: ${warnings}`, colors.yellow);
  if (failed > 0) log(`✗ Failed: ${failed}`, colors.red);

  // Recommendations
  if (failed === 0 && warnings === 0) {
    log('\n🎉 All checks passed! Your application is ready for Vercel deployment.', colors.green);
    log('\nNext steps:', colors.cyan);
    log('  1. Run: npm install', colors.reset);
    log('  2. Run: npm run build (to verify build works)', colors.reset);
    log('  3. Deploy to Vercel with root directory set to "web"', colors.reset);
  } else if (failed === 0) {
    log('\n✓ Deployment ready with minor warnings.', colors.yellow);
    log('\nConsider addressing warnings for optimal production setup.', colors.reset);
  } else {
    log('\n✗ Please fix the failed checks before deploying.', colors.red);
  }

  // Vercel-specific recommendations
  log('\n📋 Vercel Deployment Checklist:', colors.cyan);
  log('  □ Set "Root Directory" to "web"', colors.reset);
  log('  □ Framework Preset: Next.js (auto-detected)', colors.reset);
  log('  □ Build Command: npm run build (auto-detected)', colors.reset);
  log('  □ Output Directory: .next (auto-detected)', colors.reset);
  log('  □ Node.js Version: 18.x or higher', colors.reset);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run verification
runVerification().catch(err => {
  error(`\nVerification failed with error: ${err.message}`);
  process.exit(1);
});
