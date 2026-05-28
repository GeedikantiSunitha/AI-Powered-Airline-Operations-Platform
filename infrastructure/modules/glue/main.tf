variable "project_name" { type = string }
variable "environment" { type = string }
variable "data_lake_bucket" { type = string }

resource "aws_glue_catalog_database" "ops" {
  name = "${replace(var.project_name, "-", "_")}_${var.environment}_ops"
}

resource "aws_glue_crawler" "raw_flights" {
  name          = "${var.project_name}-${var.environment}-raw-flights"
  role          = "AWSGlueServiceRoleDefault"
  database_name = aws_glue_catalog_database.ops.name
  s3_target {
    path = "s3://${var.data_lake_bucket}/raw/flights/"
  }
}

