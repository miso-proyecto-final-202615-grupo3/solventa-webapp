terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Backend remoto recomendado antes de que el equipo comparta este estado.
  # backend "s3" {
  #   bucket = "solventa-webapp-tfstate"
  #   key    = "hosting/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
}
