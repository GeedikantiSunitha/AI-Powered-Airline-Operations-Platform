-- Phase 19 — Admin platform persistence

CREATE TABLE IF NOT EXISTS admin_users (
  user_id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(32) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  auth_provider VARCHAR(16) NOT NULL DEFAULT 'local',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_rules (
  rule_id VARCHAR(64) PRIMARY KEY,
  rule_type VARCHAR(50) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  threshold NUMERIC(10, 4) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  flag_key VARCHAR(64) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commercial_config (
  config_key VARCHAR(64) PRIMARY KEY,
  config_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO feature_flags (flag_key, enabled, description) VALUES
  ('module_booking', TRUE, 'Booking and My Trips'),
  ('module_commercial', TRUE, 'Commercial optimization'),
  ('module_copilot', TRUE, 'AI Copilot'),
  ('module_mlops', TRUE, 'MLOps pipelines and registry'),
  ('module_sre', TRUE, 'SRE dashboard and drills'),
  ('module_operations', TRUE, 'Crew, baggage, passenger impact')
ON CONFLICT (flag_key) DO NOTHING;

INSERT INTO commercial_config (config_key, config_value) VALUES
  ('fare_rules', '{"maxPriceMultiplier": 1.5, "minPriceMultiplier": 0.85, "dynamicPricingEnabled": true}'::jsonb),
  ('experiments', '{"ancillaryUpsellEnabled": true, "defaultExperimentId": "ancillary-upsell-v1"}'::jsonb)
ON CONFLICT (config_key) DO NOTHING;
