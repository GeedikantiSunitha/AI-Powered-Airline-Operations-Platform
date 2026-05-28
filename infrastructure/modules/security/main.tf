variable "project_name" { type = string }
variable "environment" { type = string }
variable "db_password" {
  type      = string
  sensitive = true
}

resource "aws_kms_key" "data_lake" {
  description             = "${var.project_name}-${var.environment} data lake CMK"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

resource "aws_kms_alias" "data_lake" {
  name          = "alias/${var.project_name}-${var.environment}-data-lake"
  target_key_id = aws_kms_key.data_lake.key_id
}

resource "aws_kms_key" "warehouse" {
  description             = "${var.project_name}-${var.environment} warehouse CMK"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

resource "aws_kms_alias" "warehouse" {
  name          = "alias/${var.project_name}-${var.environment}-warehouse"
  target_key_id = aws_kms_key.warehouse.key_id
}

resource "aws_kms_key" "model_artifacts" {
  description             = "${var.project_name}-${var.environment} model artifacts CMK"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

resource "aws_kms_alias" "model_artifacts" {
  name          = "alias/${var.project_name}-${var.environment}-model-artifacts"
  target_key_id = aws_kms_key.model_artifacts.key_id
}

resource "aws_kms_key" "data" {
  description             = "${var.project_name}-${var.environment} general data encryption key"
  deletion_window_in_days = 7
  enable_key_rotation     = true
}

resource "aws_secretsmanager_secret" "db" {
  name = "${var.project_name}/${var.environment}/database"
  kms_key_id = aws_kms_key.data.key_id
}

resource "aws_secretsmanager_secret_version" "db_value" {
  secret_id     = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({ username = "adminuser", password = var.db_password })
}

data "aws_iam_policy_document" "least_priv_lambda" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:*:*:log-group:/${var.project_name}/${var.environment}/*"]
  }
  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.db.arn]
  }
  statement {
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey"
    ]
    resources = [
      aws_kms_key.data_lake.arn,
      aws_kms_key.warehouse.arn,
      aws_kms_key.model_artifacts.arn,
      aws_kms_key.data.arn
    ]
  }
}

resource "aws_iam_policy" "least_priv_lambda" {
  name   = "${var.project_name}-${var.environment}-least-priv-lambda"
  policy = data.aws_iam_policy_document.least_priv_lambda.json
}

data "aws_iam_policy_document" "least_priv_api" {
  statement {
    effect = "Allow"
    actions = [
      "bedrock:InvokeModel",
      "bedrock:InvokeAgent"
    ]
    resources = ["*"]
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["true"]
    }
  }
  statement {
    effect = "Allow"
    actions = [
      "sagemaker:InvokeEndpoint"
    ]
    resources = ["arn:aws:sagemaker:*:*:endpoint/${var.project_name}-${var.environment}-*"]
  }
}

resource "aws_iam_policy" "least_priv_api" {
  name   = "${var.project_name}-${var.environment}-least-priv-api"
  policy = data.aws_iam_policy_document.least_priv_api.json
}

data "aws_iam_policy_document" "iam_audit" {
  statement {
    sid    = "DenyPublicInferenceEndpoint"
    effect = "Deny"
    actions = ["sagemaker:CreateEndpoint"]
    resources = ["*"]
    condition {
      test     = "Bool"
      variable = "sagemaker:DirectInternetAccess"
      values   = ["true"]
    }
  }
}

resource "aws_iam_policy" "security_guardrails" {
  name   = "${var.project_name}-${var.environment}-security-guardrails"
  policy = data.aws_iam_policy_document.iam_audit.json
}

output "kms_key_arn" {
  value = aws_kms_key.data.arn
}

output "kms_data_lake_key_arn" {
  value = aws_kms_key.data_lake.arn
}

output "kms_warehouse_key_arn" {
  value = aws_kms_key.warehouse.arn
}

output "kms_model_artifacts_key_arn" {
  value = aws_kms_key.model_artifacts.arn
}

output "db_secret_arn" {
  value = aws_secretsmanager_secret.db.arn
}

output "least_priv_lambda_policy_arn" {
  value = aws_iam_policy.least_priv_lambda.arn
}

output "least_priv_api_policy_arn" {
  value = aws_iam_policy.least_priv_api.arn
}

output "security_guardrails_policy_arn" {
  value = aws_iam_policy.security_guardrails.arn
}
