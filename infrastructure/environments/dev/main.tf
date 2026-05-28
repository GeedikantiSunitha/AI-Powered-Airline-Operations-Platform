# Phase 10 — Dev environment root module
# Uncomment and wire modules as you implement each phase

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  default = "us-east-1"
}

variable "project_name" {
  default = "airline-ops"
}

variable "redshift_admin_password" {
  type      = string
  sensitive = true
}

variable "db_password" {
  type      = string
  sensitive = true
}

module "vpc" {
  source      = "../../modules/vpc"
  project_name = var.project_name
  environment = "dev"
}

module "data_lake" {
  source       = "../../modules/s3-data-lake"
  project_name = var.project_name
  environment  = "dev"
}

module "eventbridge" {
  source   = "../../modules/eventbridge"
  bus_name = "${var.project_name}-events-dev"
}

module "security" {
  source       = "../../modules/security"
  project_name = var.project_name
  environment  = "dev"
  db_password  = var.db_password
}

module "cognito" {
  source       = "../../modules/cognito"
  project_name = var.project_name
  environment  = "dev"
}

module "observability" {
  source       = "../../modules/observability"
  project_name = var.project_name
  environment  = "dev"
}

module "redshift" {
  source                  = "../../modules/redshift"
  project_name            = var.project_name
  environment             = "dev"
  redshift_admin_password = var.redshift_admin_password
}

module "glue" {
  source           = "../../modules/glue"
  project_name     = var.project_name
  environment      = "dev"
  data_lake_bucket = "${var.project_name}-data-lake-dev"
}

module "vpc_endpoints" {
  source             = "../../modules/vpc-endpoints"
  project_name       = var.project_name
  environment        = "dev"
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
}

module "private_inference" {
  source             = "../../modules/private-inference"
  project_name       = var.project_name
  environment        = "dev"
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
}

output "environment" {
  value = "dev"
}

output "vpc_endpoint_ids" {
  value = module.vpc_endpoints.endpoint_ids
}

output "private_inference_public_access" {
  value = module.private_inference.public_access_enabled
}

output "kms_keys" {
  value = {
    data_lake       = module.security.kms_data_lake_key_arn
    warehouse       = module.security.kms_warehouse_key_arn
    model_artifacts = module.security.kms_model_artifacts_key_arn
  }
}
