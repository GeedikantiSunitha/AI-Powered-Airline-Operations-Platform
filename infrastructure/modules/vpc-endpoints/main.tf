variable "project_name" { type = string }
variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

resource "aws_security_group" "vpc_endpoints" {
  name        = "${var.project_name}-${var.environment}-vpc-endpoints"
  description = "Allow HTTPS from VPC to interface endpoints"
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

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${data.aws_region.current.name}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]
}

resource "aws_route_table" "private" {
  vpc_id = var.vpc_id
  tags = {
    Name = "${var.project_name}-${var.environment}-private-rt"
  }
}

resource "aws_route_table_association" "private" {
  count          = length(var.private_subnet_ids)
  subnet_id      = var.private_subnet_ids[count.index]
  route_table_id = aws_route_table.private.id
}

locals {
  interface_services = {
    bedrock_runtime = "com.amazonaws.${data.aws_region.current.name}.bedrock-runtime"
    sagemaker_api   = "com.amazonaws.${data.aws_region.current.name}.sagemaker.api"
    sagemaker_runtime = "com.amazonaws.${data.aws_region.current.name}.sagemaker.runtime"
    secretsmanager  = "com.amazonaws.${data.aws_region.current.name}.secretsmanager"
    opensearch      = "com.amazonaws.${data.aws_region.current.name}.es"
  }
}

resource "aws_vpc_endpoint" "interface" {
  for_each            = local.interface_services
  vpc_id              = var.vpc_id
  service_name        = each.value
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true
}

data "aws_region" "current" {}

output "endpoint_ids" {
  value = merge(
    { s3 = aws_vpc_endpoint.s3.id },
    { for key, endpoint in aws_vpc_endpoint.interface : key => endpoint.id }
  )
}
