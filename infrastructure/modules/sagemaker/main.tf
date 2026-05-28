variable "project_name" { type = string }
variable "environment" { type = string }

resource "aws_sagemaker_model_package_group" "delay_prediction" {
  model_package_group_name = "${var.project_name}-${var.environment}-delay-prediction"
  model_package_group_description = "Flight delay model registry group (Phase 13)"
}

resource "aws_cloudwatch_metric_alarm" "model_data_quality" {
  alarm_name          = "${var.project_name}-${var.environment}-model-data-quality"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ModelDataQualityScore"
  namespace           = "AirlineOps/ML"
  period              = 300
  statistic           = "Average"
  threshold           = 0.85
  alarm_description   = "Triggers when model input data quality drops below threshold"
}

output "model_package_group_name" {
  value = aws_sagemaker_model_package_group.delay_prediction.model_package_group_name
}
