"""Phase 13 — Model Registry promotion helper (dev -> staging -> prod)."""

from __future__ import annotations

import argparse


def promote(model_id: str, version: str, target_stage: str) -> dict:
    return {
        "model_id": model_id,
        "version": version,
        "target_stage": target_stage,
        "status": "pending_approval" if target_stage == "prod" else "approved",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-id", required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--target-stage", choices=["dev", "staging", "prod"], required=True)
    args = parser.parse_args()
    print(promote(args.model_id, args.version, args.target_stage))


if __name__ == "__main__":
    main()
