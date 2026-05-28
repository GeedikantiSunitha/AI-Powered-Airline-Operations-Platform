# AWS Infrastructure (Terraform)

Modules follow **AWS Well-Architected** pillars: security, reliability, performance, cost, operations, sustainability.

## Modules

| Module | AWS services |
|--------|----------------|
| `modules/vpc` | VPC, subnets, NAT, endpoints |
| `modules/s3-data-lake` | S3 buckets, lifecycle, KMS |
| `modules/eventbridge` | Custom event bus + rules |
| `modules/lambda` | Ingestion + alert Lambdas |
| `modules/glue` | Catalog, crawlers, ETL jobs |
| `modules/redshift` | Serverless workgroup |
| `modules/sagemaker` | Model registry, endpoints |
| `modules/bedrock` | Agent IAM, knowledge base (optional) |
| `modules/cognito` | User pool, app client |
| `modules/observability` | CloudWatch, X-Ray, alarms |
| `modules/security` | IAM roles, Secrets Manager |

## Deploy order

1. vpc → s3-data-lake → eventbridge
2. lambda, glue, redshift
3. cognito, observability
4. sagemaker, bedrock (Phase 6+)

## Usage

```bash
cd infrastructure/environments/dev
terraform init
terraform plan
# terraform apply  # when ready
```
