/**
 * Phase 16 checkpoint — quarterly failure drill across ingestion, model, and OpenSearch scenarios.
 */
import { chaosDrills } from '../services/sre/chaosDrills';
import { logAudit } from '../middleware/audit';

async function run(): Promise<void> {
  const result = await chaosDrills.runQuarterlySuite();

  await logAudit({
    action: 'sre.quarterly_failure_drill',
    resource: '/scripts/quarterly-failure-drill',
    metadata: {
      passed: result.passed,
      scenarios: result.drills.map((row) => ({
        scenario: row.scenario,
        detected: row.detected,
        mitigated: row.mitigated,
        recovered: row.recovered,
        withinSlo: row.withinSlo,
        recoveryMinutes: row.recoveryMinutes,
      })),
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: result.passed,
        recoveryTargetMinutes: result.recoveryTargetMinutes,
        drills: result.drills,
      },
      null,
      2
    )
  );

  if (!result.passed) {
    process.exitCode = 1;
  }
}

void run();
