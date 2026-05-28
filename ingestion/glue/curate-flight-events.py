"""
Phase 3–4 — Glue ETL stub:
raw flight events -> curated flight_event dataset -> Redshift staging.

Expected job parameters:
  --raw_path         s3://bucket/raw/flights/
  --curated_path     s3://bucket/curated/flight_events/
  --redshift_table   stg_flight_events
"""

from datetime import datetime, timezone


def main():
    # Placeholder structure to keep Glue contract explicit.
    print(
        {
            "step": "extract",
            "from": "raw flight events",
            "description": "Read FlightDelayed JSON records from S3 raw/",
        }
    )
    print(
        {
            "step": "transform",
            "description": "Normalize to canonical columns (flight_leg_id, event_type, delay_minutes...)",
        }
    )
    print(
        {
            "step": "load_curated",
            "to": "s3://.../curated/flight_events/",
            "format": "parquet",
        }
    )
    print(
        {
            "step": "load_staging",
            "to": "redshift stg_flight_events",
            "loaded_at": datetime.now(timezone.utc).isoformat(),
        }
    )


if __name__ == "__main__":
    main()
