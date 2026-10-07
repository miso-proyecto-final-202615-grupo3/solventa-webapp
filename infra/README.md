# Infra — hosting AWS (S3 + CloudFront)

CDK (TypeScript) que crea:

- Bucket S3 privado (sin acceso público, servido solo via CloudFront con OAC)
- Distribución CloudFront (SPA: 403/404 → `index.html`, para el router de Angular)
- IAM OIDC provider de GitHub Actions + rol `GithubActionsDeployRole` que
  asume el workflow `deploy.yml` (sin AWS keys guardadas en secrets)

## Primer deploy (una sola vez por cuenta/región)

```bash
cd infra
npm install
npx cdk bootstrap           # requiere credenciales AWS configuradas localmente
npx cdk deploy
```

Si la cuenta ya tiene un OIDC provider de GitHub (de otro proyecto), poner
`createGithubOidcProvider: false` en `bin/solventa-webapp.ts` antes de
deployar — CDK falla si se intenta crear uno duplicado para la misma URL.

## Después del deploy

`cdk deploy` imprime los outputs: `BucketName`, `DistributionId`,
`DistributionDomainName`, `DeployRoleArn`.

Cargar esos valores como **repository variables** (no secrets, no son
sensibles) en GitHub → Settings → Secrets and variables → Actions → Variables:

- `AWS_DEPLOY_ROLE_ARN` = `DeployRoleArn`
- `AWS_REGION` = región usada (`us-east-1` por defecto)
- `AWS_S3_BUCKET` = `BucketName`
- `AWS_CLOUDFRONT_DISTRIBUTION_ID` = `DistributionId`

Y crear el environment `production` en GitHub (Settings → Environments) —
`deploy.yml` lo referencia; sirve para agregar un approval gate si se quiere
más adelante.

## Deploys subsiguientes

Cambios en la infra: `npx cdk diff` para revisar, `npx cdk deploy` para
aplicar. Cambios en la app Angular: el workflow `deploy.yml` se encarga solo
al pushear a `main` (build + `s3 sync` + invalidación de CloudFront).
