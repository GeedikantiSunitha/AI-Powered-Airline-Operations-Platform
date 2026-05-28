"""
Phase 6 — Train flight delay prediction model
Features: inbound delay, weather risk, airport congestion, crew legality, rotation
Target: delay_probability, predicted_delay_minutes
"""

from __future__ import annotations

import json
from pathlib import Path


def train_stub_model(features_path: Path, output_dir: Path) -> dict:
    rows = json.loads(features_path.read_text(encoding="utf-8"))
    # Stub model artifact with deterministic weights for local Phase 6.
    model = {
      "name": "delay-risk-linear-stub",
      "version": "0.1.0",
      "weights": {
        "inbound_delay_minutes": 0.52,
        "dest_weather_risk_score": 0.20,
        "origin_congestion_score": 0.17,
        "aircraft_rotation_slack_minutes": -0.08,
        "crew_legal_flag": -0.03,
      },
      "trained_rows": len(rows),
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    model_path = output_dir / "model_delay_stub.json"
    model_path.write_text(json.dumps(model, indent=2), encoding="utf-8")
    return {"model_path": str(model_path), "trained_rows": len(rows)}


def main():
    feature_file = (
        Path(__file__).resolve().parents[2] / "features" / "delay_features_sample.json"
    )
    if not feature_file.exists():
        print(
            "Feature file missing. Run: python ml/sagemaker/features/build_delay_features.py"
        )
        return
    out = train_stub_model(feature_file, Path(__file__).resolve().parent / "artifacts")
    print(json.dumps({"ok": True, **out}, indent=2))


if __name__ == "__main__":
    main()
