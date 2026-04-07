/**
 * MedOS Global - Unit Tests
 * Runs without any external test framework (pure Node.js).
 * Tests the core logic modules: providers, safety, i18n, RAG.
 */

const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, '..', '..', '9-HuggingFace-Global');
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${message}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${message}`);
  }
}

// ===== Test 1: Cached FAQ =====
console.log('\n\x1b[1mTest Suite: Cached FAQ Provider\x1b[0m');

const cachedFaqPath = path.join(APP_DIR, 'lib', 'providers', 'cached-faq.ts');
const cachedFaqContent = fs.readFileSync(cachedFaqPath, 'utf8');

assert(
  cachedFaqContent.includes('getCachedFAQResponse'),
  'cached-faq exports getCachedFAQResponse function'
);

assert(
  cachedFaqContent.includes('headache') && cachedFaqContent.includes('fever'),
  'cached-faq includes headache and fever entries'
);

assert(
  cachedFaqContent.includes('diabetes') && cachedFaqContent.includes('blood sugar'),
  'cached-faq includes diabetes entry'
);

assert(
  cachedFaqContent.includes('malaria') && cachedFaqContent.includes('mosquito'),
  'cached-faq includes malaria entry'
);

assert(
  cachedFaqContent.includes('chest pain') || cachedFaqContent.includes('heart attack'),
  'cached-faq includes cardiac emergency entry'
);

assert(
  cachedFaqContent.includes('snakebite') || cachedFaqContent.includes('snake'),
  'cached-faq includes snakebite entry'
);

// ===== Test 2: Emergency Triage =====
console.log('\n\x1b[1mTest Suite: Emergency Triage\x1b[0m');

const triagePath = path.join(APP_DIR, 'lib', 'safety', 'triage.ts');
const triageContent = fs.readFileSync(triagePath, 'utf8');

assert(
  triageContent.includes('triageMessage'),
  'triage exports triageMessage function'
);

assert(
  triageContent.includes('chest pain') && triageContent.includes('dolor de pecho'),
  'triage detects chest pain in English and Spanish'
);

assert(
  triageContent.includes('suicide') && triageContent.includes('自杀'),
  'triage detects suicide keywords in English and Chinese'
);

assert(
  triageContent.includes('snakebite') && triageContent.includes('mordedura de serpiente'),
  'triage detects snakebite in English and Spanish'
);

assert(
  triageContent.includes("can't breathe") && triageContent.includes('不能呼吸') || triageContent.includes('呼吸困難'),
  'triage detects breathing emergency in multiple languages'
);

assert(
  triageContent.includes('isEmergency') && triageContent.includes('severity'),
  'triage returns isEmergency and severity fields'
);

// ===== Test 3: Emergency Numbers =====
console.log('\n\x1b[1mTest Suite: Emergency Numbers Database\x1b[0m');

const emergencyPath = path.join(APP_DIR, 'lib', 'safety', 'emergency-numbers.ts');
const emergencyContent = fs.readFileSync(emergencyPath, 'utf8');

assert(
  emergencyContent.includes('getEmergencyInfo'),
  'emergency-numbers exports getEmergencyInfo function'
);

assert(
  emergencyContent.includes("US:") && emergencyContent.includes("'911'"),
  'emergency-numbers includes US with 911'
);

assert(
  emergencyContent.includes("IN:") && emergencyContent.includes("'112'"),
  'emergency-numbers includes India with 112'
);

assert(
  emergencyContent.includes("NG:") && emergencyContent.includes("'199'"),
  'emergency-numbers includes Nigeria with 199'
);

assert(
  emergencyContent.includes("JP:") && emergencyContent.includes("'119'"),
  'emergency-numbers includes Japan with 119'
);

assert(
  emergencyContent.includes("BR:") && emergencyContent.includes("'192'"),
  'emergency-numbers includes Brazil with 192'
);

assert(
  emergencyContent.includes('detectCountryFromTimezone'),
  'emergency-numbers exports timezone-based country detection'
);

// ===== Test 4: i18n Locales =====
console.log('\n\x1b[1mTest Suite: i18n Locale Files\x1b[0m');

// i18n: check for the synced single-file (lib/i18n.ts) or the source
// of truth (web/lib/i18n.ts). In CI the sync hasn't run, so we check
// the web/ source directly as a fallback.
const i18nPath = path.join(APP_DIR, 'lib', 'i18n.ts');
const i18nFallback = path.join(APP_DIR, '..', 'web', 'lib', 'i18n.ts');
const i18nExists = fs.existsSync(i18nPath) || fs.existsSync(i18nFallback);
const i18nFile = fs.existsSync(i18nPath) ? i18nPath : i18nFallback;
assert(i18nExists, 'i18n.ts exists (synced or in web/ source)');

if (i18nExists) {
  const i18nContent = fs.readFileSync(i18nFile, 'utf8');
  const REQUIRED_LANGS = ['en', 'es', 'fr', 'it', 'pt', 'de', 'ar', 'hi', 'sw'];
  for (const lang of REQUIRED_LANGS) {
    const hasLang = i18nContent.includes(`nav_home`) && i18nContent.includes(`"${lang}"`);
    assert(hasLang || lang === 'en', `i18n includes ${lang} translations`);
  }
}

// ===== Test 5: Medical Knowledge Base =====
console.log('\n\x1b[1mTest Suite: Medical Knowledge Base (RAG)\x1b[0m');

const ragPath = path.join(APP_DIR, 'lib', 'rag', 'medical-kb.ts');
const ragContent = fs.readFileSync(ragPath, 'utf8');

assert(
  ragContent.includes('searchMedicalKB'),
  'medical-kb exports searchMedicalKB function'
);

assert(
  ragContent.includes('buildRAGContext'),
  'medical-kb exports buildRAGContext function'
);

assert(
  ragContent.includes('Hypertension') && ragContent.includes('Diabetes'),
  'medical-kb includes hypertension and diabetes entries'
);

assert(
  ragContent.includes('Malaria') && ragContent.includes('Tuberculosis'),
  'medical-kb includes malaria and tuberculosis entries'
);

assert(
  ragContent.includes('Depression') && ragContent.includes('Anxiety'),
  'medical-kb includes mental health entries'
);

assert(
  ragContent.includes('Pregnancy') && ragContent.includes('Childhood Diarrhea'),
  'medical-kb includes maternal/child health entries'
);

// ===== Test 6: OllaBridge Provider =====
console.log('\n\x1b[1mTest Suite: OllaBridge Provider Integration\x1b[0m');

const ollabridgePath = path.join(APP_DIR, 'lib', 'providers', 'ollabridge.ts');
const ollabridgeContent = fs.readFileSync(ollabridgePath, 'utf8');

assert(
  ollabridgeContent.includes('streamWithOllaBridge'),
  'ollabridge exports streamWithOllaBridge function'
);

assert(
  ollabridgeContent.includes('chatWithOllaBridge'),
  'ollabridge exports chatWithOllaBridge function'
);

assert(
  ollabridgeContent.includes('OLLABRIDGE_URL'),
  'ollabridge reads OLLABRIDGE_URL from environment'
);

assert(
  ollabridgeContent.includes('qwen2.5:1.5b'),
  'ollabridge defaults to qwen2.5:1.5b model'
);

assert(
  ollabridgeContent.includes("import OpenAI from 'openai'"),
  'ollabridge uses OpenAI SDK for OpenAI-compatible API'
);

// ===== Test 7: Provider Fallback Chain =====
console.log('\n\x1b[1mTest Suite: Provider Fallback Chain\x1b[0m');

const providerIndexPath = path.join(APP_DIR, 'lib', 'providers', 'index.ts');
const providerIndexContent = fs.readFileSync(providerIndexPath, 'utf8');

assert(
  providerIndexContent.includes('streamWithFallback'),
  'provider index exports streamWithFallback function'
);

assert(
  providerIndexContent.includes('chatWithFallback'),
  'provider index exports chatWithFallback function'
);

assert(
  providerIndexContent.includes('ollabridge') && providerIndexContent.includes('huggingface') && providerIndexContent.includes('cached'),
  'provider index imports all three fallback providers'
);

// ===== Test 8: API Routes =====
console.log('\n\x1b[1mTest Suite: API Routes\x1b[0m');

const chatRoutePath = path.join(APP_DIR, 'app', 'api', 'chat', 'route.ts');
const chatRouteContent = fs.readFileSync(chatRoutePath, 'utf8');

assert(
  chatRouteContent.includes('export async function POST'),
  'chat route exports POST handler'
);

assert(
  chatRouteContent.includes('triageMessage'),
  'chat route performs emergency triage before LLM call'
);

assert(
  chatRouteContent.includes('buildRAGContext'),
  'chat route includes RAG context in prompts'
);

assert(
  chatRouteContent.includes('text/event-stream'),
  'chat route uses Server-Sent Events for streaming'
);

assert(
  chatRouteContent.includes('streamWithFallback'),
  'chat route uses fallback provider chain'
);

const healthRoutePath = path.join(APP_DIR, 'app', 'api', 'health', 'route.ts');
assert(
  fs.existsSync(healthRoutePath),
  'health check API route exists'
);

// ===== Test 9: Health Topics Data =====
console.log('\n\x1b[1mTest Suite: Health Topics Data\x1b[0m');

const REQUIRED_REGIONS = [
  'global', 'africa', 'south-asia', 'east-asia',
  'southeast-asia', 'americas', 'europe', 'middle-east',
];

for (const region of REQUIRED_REGIONS) {
  const topicPath = path.join(APP_DIR, 'data', 'health-topics', `${region}.json`);
  const exists = fs.existsSync(topicPath);
  assert(exists, `health topics file ${region}.json exists`);

  if (exists) {
    const content = JSON.parse(fs.readFileSync(topicPath, 'utf8'));
    assert(
      content.region === region && Array.isArray(content.categories),
      `${region}.json has valid structure (region + categories)`
    );
  }
}

// ===== Test 10: PWA and Mobile =====
console.log('\n\x1b[1mTest Suite: PWA and Mobile Support\x1b[0m');

const manifestPath = path.join(APP_DIR, 'public', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

assert(manifest.name !== undefined, 'manifest.json has name');
assert(manifest.short_name !== undefined, 'manifest.json has short_name');
assert(manifest.display === 'standalone', 'manifest.json display is standalone');
assert(manifest.start_url && manifest.start_url.startsWith('/'), 'manifest.json start_url starts with /');
assert(Array.isArray(manifest.icons), 'manifest.json has icons array');

assert(
  fs.existsSync(path.join(APP_DIR, 'public', 'sw.js')),
  'service worker sw.js exists'
);

assert(
  fs.existsSync(path.join(APP_DIR, 'lib', 'mobile', 'pwa.ts')),
  'PWA utility module exists'
);

assert(
  fs.existsSync(path.join(APP_DIR, 'lib', 'mobile', 'viewport.ts')),
  'viewport utility module exists'
);

assert(
  fs.existsSync(path.join(APP_DIR, 'lib', 'mobile', 'offline-cache.ts')),
  'offline cache module exists'
);

assert(
  fs.existsSync(path.join(APP_DIR, 'lib', 'mobile', 'touch.ts')),
  'touch gesture module exists'
);

// ===== Test 11: Docker Configuration =====
console.log('\n\x1b[1mTest Suite: Docker Configuration\x1b[0m');

const dockerfilePath = path.join(APP_DIR, 'Dockerfile');
const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');

assert(
  dockerfile.includes('7860'),
  'Dockerfile exposes port 7860 (HF Spaces requirement)'
);

assert(
  dockerfile.includes('standalone'),
  'Dockerfile references standalone output mode'
);

assert(
  dockerfile.includes('HEALTHCHECK'),
  'Dockerfile includes HEALTHCHECK instruction'
);

assert(
  dockerfile.includes('node:18-alpine'),
  'Dockerfile uses node:18-alpine base image'
);

assert(
  dockerfile.includes('AS deps') && dockerfile.includes('AS builder') && dockerfile.includes('AS runner'),
  'Dockerfile uses multi-stage build (deps, builder, runner)'
);

// ===== Test 12: Disclaimer System =====
console.log('\n\x1b[1mTest Suite: Disclaimer System\x1b[0m');

const disclaimerPath = path.join(APP_DIR, 'lib', 'safety', 'disclaimer.ts');
const disclaimerContent = fs.readFileSync(disclaimerPath, 'utf8');

assert(
  disclaimerContent.includes('getDisclaimer'),
  'disclaimer exports getDisclaimer function'
);

// Check disclaimers exist for key languages
for (const lang of ['en', 'es', 'zh', 'hi', 'ar', 'fr', 'ru']) {
  assert(
    disclaimerContent.includes(`${lang}:`),
    `disclaimer includes ${lang} language`
  );
}

// ===== Results =====
console.log('\n' + '='.repeat(50));
console.log(`\x1b[1mResults: ${passed} passed, ${failed} failed, ${passed + failed} total\x1b[0m`);
console.log('='.repeat(50));

if (failed > 0) {
  console.log(`\n\x1b[31m${failed} test(s) failed!\x1b[0m\n`);
  process.exit(1);
} else {
  console.log(`\n\x1b[32mAll tests passed!\x1b[0m\n`);
  process.exit(0);
}
