variable "project_name" { type = string }
variable "environment" { type = string }
variable "event_bus_name" { type = string }

resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-${var.environment}-lambda-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Placeholder only: package/deployment wired in CI later.
resource "aws_lambda_function" "alert_trigger" {
  function_name = "${var.project_name}-${var.environment}-alert-trigger"
  role          = aws_iam_role.lambda_exec.arn
  package_type  = "Image"
  image_uri     = "public.ecr.aws/lambda/nodejs:20"
  environment {
    variables = {
      EVENT_BUS_NAME = var.event_bus_name
    }
  }
}

output "alert_trigger_lambda_arn" {
  value = aws_lambda_function.alert_trigger.arn
}

