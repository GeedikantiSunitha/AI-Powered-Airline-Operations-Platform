variable "project_name" { type = string }
variable "environment" { type = string }

resource "aws_cognito_user_pool" "ops" {
  name = "${var.project_name}-${var.environment}-users"
  auto_verified_attributes = ["email"]
}

resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.project_name}-${var.environment}-web-client"
  user_pool_id = aws_cognito_user_pool.ops.id
}

output "user_pool_id" {
  value = aws_cognito_user_pool.ops.id
}

output "client_id" {
  value = aws_cognito_user_pool_client.web.id
}

