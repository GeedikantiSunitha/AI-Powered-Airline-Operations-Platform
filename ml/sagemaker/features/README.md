# Feature store definitions

Document feature names, sources, and refresh cadence for each model.

Example features for delay prediction:

- `inbound_delay_minutes`
- `dest_weather_risk_score`
- `origin_congestion_score`
- `crew_legal_flag`
- `aircraft_rotation_slack_minutes`

## Local feature extraction (Phase 6)

Build features for one or more flights using:

```bash
python "ml/sagemaker/features/build_delay_features.py"
```

Output file:

- `ml/sagemaker/features/delay_features_sample.json`
