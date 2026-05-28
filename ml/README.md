# ML (Amazon SageMaker)

## Models

| Model | Path | Phase |
|-------|------|-------|
| Flight delay prediction | `sagemaker/training/delay_prediction/` | 6 |
| Weather impact (route/airport) | `sagemaker/training/weather_impact/` | 12 |
| Passenger disruption scoring | `sagemaker/training/passenger_disruption/` | 12 |
| Predictive maintenance risk | `sagemaker/training/maintenance_risk/` | 12 |
| Baggage delay | `sagemaker/training/baggage_delay/` | 6+ |
| Airport congestion | `sagemaker/training/airport_congestion/` | 6+ |
| Fuel optimization | `sagemaker/training/fuel_optimization/` | 6+ |

## Pipeline

1. Features from Redshift/S3 (`sagemaker/features/`)
2. SageMaker Pipeline (`sagemaker/pipelines/`) runs train → evaluate → approval → deploy
3. Model Registry promotion (`sagemaker/registry/`) across `dev` → `staging` → `prod`
4. Drift + data quality alarms trigger approval gate and rollback to last-known-good
5. Lambda or API invokes endpoint on `DelayRiskElevated` events

## Local dev

Use mock scores in `backend/src/services/prediction/` until endpoint is deployed.
