# Infra — hosting AWS (S3 + CloudFront)

Terraform que crea:

- Bucket S3 privado (sin acceso público, servido solo via CloudFront con OAC)
- Distribución CloudFront (SPA: 403/404 → `index.html`, para el router de Angular)
- IAM OIDC provider de GitHub Actions + rol `github_actions_deploy` que
  asume el workflow `deploy.yml` (sin AWS keys guardadas en secrets)

Sin backend remoto configurado todavía (estado local `terraform.tfstate`,
ignorado en git). Antes de que el equipo comparta este estado, descomentar
el bloque `backend "s3"` en `versions.tf` y migrar con `terraform init
-migrate-state`.

## Primer deploy (una sola vez por cuenta/región)

Requiere Terraform >= 1.9 y credenciales AWS configuradas localmente
(`aws configure` o variables `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`).

```bash
cd infra
terraform init
terraform plan
terraform apply
```

`terraform init` genera `.terraform.lock.hcl` — committearlo (fija las
versiones exactas de providers, igual que un lockfile de npm).

Si la cuenta ya tiene un OIDC provider de GitHub (de otro proyecto), pasar
`-var="create_github_oidc_provider=false"` en plan/apply — Terraform falla
si se intenta crear uno duplicado para la misma URL.

## Después del apply

Este stack es el ambiente **dev** (`var.environment = "dev"`, prefija todos
los nombres de recursos — bucket, rol, OAC — para no chocar con un futuro
stack de prod en la misma cuenta).

`terraform apply` imprime los outputs: `bucket_name`, `distribution_id`,
`distribution_domain_name`, `deploy_role_arn` (también disponibles después
con `terraform output`).

1. Crear el environment `dev` en GitHub → Settings → Environments.
2. Cargar los outputs ahí como **environment variables** de `dev` (no
   repository variables — así, cuando exista prod, cada environment tiene
   su propio bucket/rol sin pisarse):
   - `AWS_DEPLOY_ROLE_ARN` = `deploy_role_arn`
   - `AWS_REGION` = región usada (`us-east-1` por defecto, variable `aws_region`)
   - `AWS_S3_BUCKET` = `bucket_name`
   - `AWS_CLOUDFRONT_DISTRIBUTION_ID` = `distribution_id`

`deploy.yml` ya referencia `environment: dev`, así que toma esas variables
automáticamente.

## Cambios subsiguientes

Cambios en la infra: `terraform plan` para revisar, `terraform apply` para
aplicar. Cambios en la app Angular: el workflow `deploy.yml` se encarga solo
al pushear a `main` (build + `s3 sync` + invalidación de CloudFront).

## Archivos

| Archivo         | Contenido                                               |
| --------------- | ------------------------------------------------------- |
| `versions.tf`   | provider AWS, versión de Terraform, backend (comentado) |
| `variables.tf`  | región, repo de GitHub, flag del OIDC provider          |
| `s3.tf`         | bucket privado + policy (solo CloudFront, fuerza TLS)   |
| `cloudfront.tf` | distribución + OAC + fallback SPA                       |
| `oidc.tf`       | OIDC provider de GitHub (crear o reusar)                |
| `iam.tf`        | rol + policy que asume GitHub Actions                   |
| `outputs.tf`    | valores para cargar como variables en GitHub            |
