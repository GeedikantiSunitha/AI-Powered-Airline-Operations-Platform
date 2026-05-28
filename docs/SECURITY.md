# Security Requirements

## Network

- All data services in **private VPC subnets**
- API behind ALB + WAF; no direct Redshift internet access
- VPC endpoints for S3, Bedrock, SageMaker where applicable

## Identity & access

| Role | Permissions |
|------|-------------|
| admin | Full config, users, alert rules |
| operations_manager | All dashboards, acknowledge alerts, copilot |
| crew_manager | Crew + flight dashboards, crew agent |
| analyst | KPI + read-only ops data, export |
| viewer | Read-only dashboards |

- **Cognito** (prod) or local JWT (dev)
- **IAM**: least privilege per Lambda, Glue job, Bedrock agent role

## Data protection

- Encryption at rest: S3 SSE-KMS, Redshift encrypted
- TLS 1.2+ in transit
- **Secrets Manager** for API keys, DB credentials, third-party weather keys
- **PII masking** on passenger names, contact, document numbers in analyst/viewer roles

## Audit

Log every:

- User login and permission-denied attempts
- AI copilot prompt, data sources, tool calls, response, confidence
- Agent recommendation with human approval status
- Alert acknowledge / dismiss / escalate

Storage: `audit_logs` table + CloudWatch Logs → S3 archive.

Phase 15 adds trace-linked audit chains (`traceId`) across user prompt, AI tool calls, model decisions, recommendation, and approval state. Security review APIs expose posture and chain validation.

## AI safety

- Agents cannot execute irreversible actions without `approvalRequired: true`
- Tool allowlist per agent
- Output validation against schema before showing in UI
