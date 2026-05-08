/**
 * Golden-prompt runner.
 *
 * Loads `tests/safety/golden_prompts.jsonl` and runs `preCheck()` from the
 * MedOS safety engine on each prompt. Asserts:
 *
 *   - The returned riskClass is at least the case's `expected_risk`.
 *   - Every id in `expected_rules` (if set) appears in the rule fires.
 *
 * Also runs `tests/safety/output_filter_cases.jsonl` through `filterOutput()`.
 *
 * Exit code is non-zero on any failure. Used in Phase 1C CI.
 *
 * Usage:
 *   npx tsx tests/safety/run_golden.ts
 *   # or
 *   npm run test:safety   (added in Phase 1C)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  preCheck,
  filterOutput,
  isAtLeast,
  RISK_CLASSES,
  type RiskClass,
} from '../../9-HuggingFace-Global/lib/safety';

interface GoldenCase {
  id: string;
  prompt: string;
  expected_risk: RiskClass;
  expected_rules?: string[];
  language?: string;
  category?: string;
  patient_context?: { ageYears?: number; ageMonths?: number; pregnant?: boolean; isInfant?: boolean };
  notes?: string;
}

interface OutputFilterCase {
  id: string;
  model_output: string;
  risk_class: RiskClass;
  must_not_contain?: string[];
  must_contain_one_of?: string[];
  expected_filter_fires?: string[];
}

function loadJsonl<T>(path: string): T[] {
  const txt = readFileSync(path, 'utf8');
  const out: T[] = [];
  for (const raw of txt.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    try {
      out.push(JSON.parse(line) as T);
    } catch (e) {
      throw new Error(`Could not parse line in ${path}: ${line.slice(0, 80)}…`);
    }
  }
  return out;
}

interface Failure { id: string; reason: string }

function runPreCheckCases(cases: GoldenCase[]): Failure[] {
  const failures: Failure[] = [];
  for (const c of cases) {
    const decision = preCheck({
      text: c.prompt,
      countryCode: c.language?.split('-')[1] ?? 'US',
      patientContext: c.patient_context,
    });
    const actualRisk = decision.riskClass;
    if (!isAtLeast(actualRisk, c.expected_risk)) {
      failures.push({
        id: c.id,
        reason: `expected_risk ${c.expected_risk} but got ${actualRisk}`,
      });
      continue;
    }
    if (c.expected_rules && c.expected_rules.length > 0) {
      const fires = decision.audit.ruleFires;
      const missing = c.expected_rules.filter((r) => !fires.includes(r));
      if (missing.length > 0) {
        failures.push({
          id: c.id,
          reason: `expected rule fires ${missing.join(',')} not present (got ${fires.join(',') || '<none>'})`,
        });
      }
    }
  }
  return failures;
}

function runOutputFilterCases(cases: OutputFilterCase[]): Failure[] {
  const failures: Failure[] = [];
  for (const c of cases) {
    const spec = RISK_CLASSES[c.risk_class];
    const result = filterOutput(c.model_output, {
      riskClass: c.risk_class,
      emergencyNumberRequired: spec.emergencyNumberRequired,
      emergencyNumber: '911',
      clinicianReferralRequired: spec.clinicianReferralRequired,
    });

    const txt = result.filtered;
    const txtL = txt.toLowerCase();

    if (c.must_not_contain) {
      for (const n of c.must_not_contain) {
        if (txtL.includes(n.toLowerCase())) {
          failures.push({
            id: c.id,
            reason: `output still contains "${n}" after filter`,
          });
        }
      }
    }
    if (c.must_contain_one_of && c.must_contain_one_of.length > 0) {
      const ok = c.must_contain_one_of.some((n) => txtL.includes(n.toLowerCase()));
      if (!ok) {
        failures.push({
          id: c.id,
          reason: `output missing any of ${c.must_contain_one_of.join('/')} after filter`,
        });
      }
    }
    if (c.expected_filter_fires && c.expected_filter_fires.length > 0) {
      const fires = result.matches.map((m) => m.rule);
      const missing = c.expected_filter_fires.filter((f) => !fires.includes(f));
      if (missing.length > 0) {
        failures.push({
          id: c.id,
          reason: `expected filter fires ${missing.join(',')} not present (got ${fires.join(',') || '<none>'})`,
        });
      }
    }
  }
  return failures;
}

function main() {
  const goldenPath  = resolve(__dirname, 'golden_prompts.jsonl');
  const filterPath  = resolve(__dirname, 'output_filter_cases.jsonl');
  const golden      = loadJsonl<GoldenCase>(goldenPath);
  const filterCases = loadJsonl<OutputFilterCase>(filterPath);

  const f1 = runPreCheckCases(golden);
  const f2 = runOutputFilterCases(filterCases);

  const total = golden.length + filterCases.length;
  const failed = f1.length + f2.length;

  for (const f of [...f1, ...f2]) {
    // eslint-disable-next-line no-console
    console.error(`FAIL ${f.id}: ${f.reason}`);
  }

  // eslint-disable-next-line no-console
  console.log(
    `\nGolden tests: ${total - failed}/${total} passed (${golden.length} pre-check + ${filterCases.length} output-filter)`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
