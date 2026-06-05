/**
 * Phase 11+ completion gates — validates all six exit criteria locally.
 * Run: cd backend && npm run validate:phase11-gates
 */
import { phase11Gates } from '../services/completion-gates/phase11Gates';

async function run(): Promise<void> {
  const report = await phase11Gates.validateAll();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) {
    process.exitCode = 1;
  }
}

void run();
