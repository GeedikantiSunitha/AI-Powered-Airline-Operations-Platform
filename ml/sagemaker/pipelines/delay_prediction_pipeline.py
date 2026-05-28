"""
Phase 13 — SageMaker Pipeline definition (train -> evaluate -> approve -> deploy).
Local stub; wire to sagemaker.workflow in AWS account for production.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class PipelineStep:
    name: str
    description: str


PIPELINE_STEPS = [
    PipelineStep("PreprocessFeatures", "Build and validate delay feature set"),
    PipelineStep("TrainModel", "Train flight_delay_v1 estimator"),
    PipelineStep("EvaluateModel", "Run holdout metrics and bias checks"),
    PipelineStep("ApprovalGate", "Require human approval before prod promotion"),
    PipelineStep("RegisterModel", "Register artifact in SageMaker Model Registry"),
    PipelineStep("DeployEndpoint", "Deploy approved version to inference endpoint"),
]


def build_pipeline_definition() -> dict:
    return {
        "pipeline_name": "delay-prediction-pipeline",
        "version": "1.0.0",
        "steps": [step.__dict__ for step in PIPELINE_STEPS],
        "promotion_path": ["dev", "staging", "prod"],
        "rollback_policy": "last_known_good",
    }


def main() -> None:
  definition = build_pipeline_definition()
  print(definition)


if __name__ == "__main__":
  main()
