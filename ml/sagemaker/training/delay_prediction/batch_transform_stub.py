"""Batch transform stub for delay predictions (Phase 6)."""

from __future__ import annotations

import json
from pathlib import Path


def score(row: dict) -> dict:
    weighted = (
        0.52 * min(1.0, row["inbound_delay_minutes"] / 60.0)
        + 0.20 * row["dest_weather_risk_score"]
        + 0.17 * row["origin_congestion_score"]
        + 0.08 * (1.0 - min(1.0, row["aircraft_rotation_slack_minutes"] / 40.0))
        + 0.03 * (1.0 - row["crew_legal_flag"])
    )
    probability = max(0.01, min(0.99, weighted))
    return {
        "flightLegId": row["flightLegId"],
        "delayProbability": round(probability, 2),
        "predictedDelayMinutes": int(
            10
            + row["inbound_delay_minutes"] * 0.65
            + row["dest_weather_risk_score"] * 24
            + row["origin_congestion_score"] * 18
        ),
    }


def main() -> None:
    features_path = Path(__file__).resolve().parents[2] / "features" / "delay_features_sample.json"
    rows = json.loads(features_path.read_text(encoding="utf-8"))
    predictions = [score(r) for r in rows]
    out_path = Path(__file__).resolve().parent / "batch_predictions.json"
    out_path.write_text(json.dumps(predictions, indent=2), encoding="utf-8")
    print(f"wrote {len(predictions)} predictions -> {out_path}")


if __name__ == "__main__":
    main()

