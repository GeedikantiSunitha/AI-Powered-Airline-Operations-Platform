import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { runKpiAggregation } from '../../backend/src/jobs/kpi-aggregation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

runKpiAggregation()
  .then(() => {
    console.log('kpi aggregate complete');
  })
  .catch((err) => {
    console.error('kpi aggregate failed', err);
    process.exit(1);
  });

