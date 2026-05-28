# S3 Data Lake — Phase 3+
# Prefixes: raw/, curated/, processed/, curated/kpi_reports/

variable "project_name" { type = string }
variable "environment" { type = string }

resource "aws_s3_bucket" "data_lake" {
  bucket = "${var.project_name}-data-lake-${var.environment}"
}

resource "aws_s3_bucket_versioning" "versioning" {
  bucket = aws_s3_bucket.data_lake.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "encryption" {
  bucket = aws_s3_bucket.data_lake.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "block" {
  bucket                  = aws_s3_bucket.data_lake.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_object" "raw_prefix" {
  bucket = aws_s3_bucket.data_lake.id
  key    = "raw/"
}

resource "aws_s3_object" "curated_prefix" {
  bucket = aws_s3_bucket.data_lake.id
  key    = "curated/"
}

resource "aws_s3_object" "processed_prefix" {
  bucket = aws_s3_bucket.data_lake.id
  key    = "processed/"
}
