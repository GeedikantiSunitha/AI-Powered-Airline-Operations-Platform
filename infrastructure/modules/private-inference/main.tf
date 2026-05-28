variable "project_name" { type = string }
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

resource "aws_security_group" "inference" {
  name        = "${var.project_name}-${var.environment}-private-inference"
  description = "Private SageMaker inference — no public ingress"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_sagemaker_model" "delay_private" {
  name               = "${var.project_name}-${var.environment}-delay-private"
  execution_role_arn = aws_iam_role.sagemaker_inference.arn

  primary_container {
    image = "763104351884.dkr.ecr.${data.aws_region.current.name}.amazonaws.com/pytorch-inference:2.0.0-cpu-py310-ubuntu20.04-sagemaker"
    mode  = "SingleModel"
  }

  vpc_config {
    subnets            = var.private_subnet_ids
    security_group_ids = [aws_security_group.inference.id]
  }
}

resource "aws_sagemaker_endpoint_configuration" "delay_private" {
  name = "${var.project_name}-${var.environment}-delay-private-cfg"

  production_variants {
    model_name             = aws_sagemaker_model.delay_private.name
    variant_name           = "primary"
    initial_instance_count = 1
    instance_type          = "ml.m5.large"
  }
}

resource "aws_iam_role" "sagemaker_inference" {
  name = "${var.project_name}-${var.environment}-sagemaker-inference"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "sagemaker.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

data "aws_iam_policy_document" "sagemaker_least_priv" {
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "sagemaker_inference" {
  name   = "least-privilege-inference"
  role   = aws_iam_role.sagemaker_inference.id
  policy = data.aws_iam_policy_document.sagemaker_least_priv.json
}

data "aws_region" "current" {}

output "endpoint_configuration_name" {
  value = aws_sagemaker_endpoint_configuration.delay_private.name
}

output "public_access_enabled" {
  value = false
}

output "security_group_id" {
  value = aws_security_group.inference.id
}
