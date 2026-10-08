variable "aws_region" {
  description = "Región AWS donde se crea el bucket y el rol (CloudFront es global)."
  type        = string
  default     = "us-east-1"
}

variable "github_repo" {
  description = "org/repo de GitHub autorizado a asumir el rol de deploy, p.ej. \"org/repo\"."
  type        = string
  default     = "miso-proyecto-final-202615-grupo3/solventa-webapp"
}

variable "create_github_oidc_provider" {
  description = <<-EOT
    true si la cuenta AWS todavía no tiene un OIDC provider de GitHub Actions.
    AWS solo permite uno por cuenta para la misma URL — si ya existe (de otro
    proyecto/repo), poner false y el rol reutiliza el existente.
  EOT
  type        = bool
  default     = true
}
