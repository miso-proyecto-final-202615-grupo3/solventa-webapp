# Solventa · webapp

Implementación Angular del prototipo navegable de Solventa (canal web: portal
cliente y back-office del operador).

Referencia de diseño: `../githubPagesProjectFinal` (prototipo HTML/CSS/JS,
sistema de diseño en `_ds/`, datos de ejemplo en `datos.js`).

## Stack

- Angular 22, standalone components, signals
- SCSS, tokens de diseño portados desde `_ds/tokens/*.css`
- ESLint + Prettier + Stylelint + Husky (pre-commit)

Generado con [Angular CLI](https://github.com/angular/angular-cli) v22.2.2.

## CI/CD

- `.github/workflows/ci.yml`: lint + test + build en cada PR/push a `main`.
- `.github/workflows/deploy.yml`: deploy a AWS (S3 + CloudFront) al pushear
  a `main`, autenticado via OIDC (sin AWS keys guardadas).
- `infra/`: Terraform con la infra de hosting. Ver `infra/README.md` para
  el setup inicial (`terraform init` + `terraform apply`) y qué variables
  cargar en GitHub.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
