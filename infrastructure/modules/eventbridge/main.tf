# EventBridge custom bus — Phase 3+
# Event types: see docs/EVENT_CATALOG.md

resource "aws_cloudwatch_event_bus" "ops" {
  name = var.bus_name
}

# Route FlightDelayed events to the processor Lambda.
# Wire target ARNs in env-level stacks.
resource "aws_cloudwatch_event_rule" "flight_delayed" {
  name           = "${var.bus_name}-flight-delayed"
  description    = "Match FlightDelayed operational events"
  event_bus_name = aws_cloudwatch_event_bus.ops.name
  event_pattern = jsonencode({
    source      = ["airline.ops.flights"]
    detail-type = ["FlightDelayed"]
  })
}

resource "aws_cloudwatch_event_rule" "crew_unavailable" {
  name           = "${var.bus_name}-crew-unavailable"
  description    = "Match CrewUnavailable events"
  event_bus_name = aws_cloudwatch_event_bus.ops.name
  event_pattern = jsonencode({
    source      = ["airline.ops.crew"]
    detail-type = ["CrewUnavailable"]
  })
}

resource "aws_cloudwatch_event_rule" "weather_risk" {
  name           = "${var.bus_name}-weather-risk"
  description    = "Match WeatherRiskDetected events"
  event_bus_name = aws_cloudwatch_event_bus.ops.name
  event_pattern = jsonencode({
    source      = ["airline.ops.weather"]
    detail-type = ["WeatherRiskDetected"]
  })
}

variable "bus_name" {
  default = "airline-ops-events"
}
