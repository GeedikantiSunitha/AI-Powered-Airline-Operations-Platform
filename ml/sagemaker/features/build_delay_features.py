"""Build sample delay prediction features from known flights."""

from __future__ import annotations

import json
from pathlib import Path


def build_features() -> list[dict]:
    return [
        {
            "flightLegId": "FL-20260521-AI302-DEL-BOM",
            "inbound_delay_minutes": 45,
            "dest_weather_risk_score": 0.42,
            "origin_congestion_score": 0.58,
            "crew_legal_flag": 1,
            "aircraft_rotation_slack_minutes": 10,
        },
        {
            "flightLegId": "FL-20260521-AI405-BOM-BLR",
            "inbound_delay_minutes": 25,
            "dest_weather_risk_score": 0.28,
            "origin_congestion_score": 0.63,
            "crew_legal_flag": 1,
            "aircraft_rotation_slack_minutes": 15,
        },
        {
            "flightLegId": "FL-20260521-AI118-DEL-DXB",
            "inbound_delay_minutes": 0,
            "dest_weather_risk_score": 0.21,
            "origin_congestion_score": 0.58,
            "crew_legal_flag": 1,
            "aircraft_rotation_slack_minutes": 35,
        },
    ]


def main() -> None:
    rows = build_features()
    out = Path(__file__).resolve().parent / "delay_features_sample.json"
    out.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print(f"wrote {len(rows)} feature rows -> {out}")


if __name__ == "__main__":
    main()

