variable "project_name" { type = string }
variable "environment" { type = string }
variable "redshift_admin_password" {
  type      = string
  sensitive = true
}

resource "aws_redshiftserverless_namespace" "ops" {
  namespace_name      = "${var.project_name}-${var.environment}-ns"
  db_name             = "airline_ops"
  admin_username      = "adminuser"
  admin_user_password = var.redshift_admin_password
}

resource "aws_redshiftserverless_workgroup" "ops" {
  workgroup_name = "${var.project_name}-${var.environment}-wg"
  namespace_name = aws_redshiftserverless_namespace.ops.namespace_name
  base_capacity  = 32
  publicly_accessible = false
}

output "workgroup_name" {
  value = aws_redshiftserverless_workgroup.ops.workgroup_name
}

