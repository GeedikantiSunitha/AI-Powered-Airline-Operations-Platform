variable "project_name" { type = string }
variable "environment" { type = string }

resource "aws_cloudwatch_log_group" "api" {
  name              = "/${var.project_name}/${var.environment}/api"
  retention_in_days = 30
}

resource "aws_cloudwatch_metric_alarm" "pipeline_failures" {
  alarm_name          = "${var.project_name}-${var.environment}-pipeline-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "PipelineFailures"
  namespace           = "AirlineOps"
  period              = 60
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Triggers when ingestion pipeline emits failure metric"
}

resource "aws_cloudwatch_metric_alarm" "model_drift" {
  alarm_name          = "${var.project_name}-${var.environment}-model-drift"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ModelDriftScore"
  namespace           = "AirlineOps/ML"
  period              = 300
  statistic           = "Average"
  threshold           = 0.25
  alarm_description   = "Triggers when drift score exceeds threshold"
}

resource "aws_cloudwatch_metric_alarm" "api_error_rate" {
  alarm_name          = "${var.project_name}-${var.environment}-api-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ApiErrorRatePct"
  namespace           = "AirlineOps/API"
  period              = 60
  statistic           = "Average"
  threshold           = 1
  alarm_description   = "Triggers when API error rate exceeds SLO"
}

resource "aws_cloudwatch_metric_alarm" "agent_latency" {
  alarm_name          = "${var.project_name}-${var.environment}-agent-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "AgentLatencyP95Ms"
  namespace           = "AirlineOps/Agents"
  period              = 60
  statistic           = "Average"
  threshold           = 2000
  alarm_description   = "Triggers when agent orchestration latency exceeds SLO"
}

resource "aws_cloudwatch_metric_alarm" "synthetic_failures" {
  alarm_name          = "${var.project_name}-${var.environment}-synthetic-failures"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "SyntheticPassRatePct"
  namespace           = "AirlineOps/Synthetics"
  period              = 300
  statistic           = "Average"
  threshold           = 99
  alarm_description   = "Triggers when synthetic journey pass rate drops below target"
}

resource "aws_cloudwatch_dashboard" "ops" {
  dashboard_name = "${var.project_name}-${var.environment}-ops"
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        x = 0
        y = 0
        width = 12
        height = 6
        properties = {
          title = "Pipeline Health"
          metrics = [["AirlineOps", "PipelineFailures"]]
          stat = "Sum"
          period = 60
        }
      },
      {
        type = "metric"
        x = 12
        y = 0
        width = 12
        height = 6
        properties = {
          title = "Model Drift / Health"
          metrics = [["AirlineOps/ML", "ModelDriftScore"]]
          stat = "Average"
          period = 300
        }
      },
      {
        type = "metric"
        x = 0
        y = 6
        width = 12
        height = 6
        properties = {
          title = "API SLO — Error Rate"
          metrics = [["AirlineOps/API", "ApiErrorRatePct"]]
          stat = "Average"
          period = 60
        }
      },
      {
        type = "metric"
        x = 12
        y = 6
        width = 12
        height = 6
        properties = {
          title = "Agent Latency P95"
          metrics = [["AirlineOps/Agents", "AgentLatencyP95Ms"]]
          stat = "Average"
          period = 60
        }
      },
      {
        type = "metric"
        x = 0
        y = 12
        width = 24
        height = 6
        properties = {
          title = "Synthetic Journey Pass Rate"
          metrics = [["AirlineOps/Synthetics", "SyntheticPassRatePct"]]
          stat = "Average"
          period = 300
        }
      }
    ]
  })
}

resource "aws_xray_sampling_rule" "all" {
  rule_name      = "${var.project_name}-${var.environment}-xray-all"
  priority       = 1000
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.1
  host           = "*"
  http_method    = "*"
  service_name   = "*"
  service_type   = "*"
  resource_arn   = "*"
  url_path       = "*"
}

output "dashboard_name" {
  value = aws_cloudwatch_dashboard.ops.dashboard_name
}

output "alarm_names" {
  value = [
    aws_cloudwatch_metric_alarm.pipeline_failures.alarm_name,
    aws_cloudwatch_metric_alarm.model_drift.alarm_name,
    aws_cloudwatch_metric_alarm.api_error_rate.alarm_name,
    aws_cloudwatch_metric_alarm.agent_latency.alarm_name,
    aws_cloudwatch_metric_alarm.synthetic_failures.alarm_name,
  ]
}
