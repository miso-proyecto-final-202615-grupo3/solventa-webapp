---
name: angular-quality
description: Verifica y repara el pipeline de calidad de solventa-webapp (ESLint, Stylelint, Prettier, Husky pre-commit). Usar cuando el usuario pida "revisa el lint", "chequea husky", "arregla el pre-commit", o antes de un commit grande para asegurar que los hooks corren.
---

# Angular quality gate — solventa-webapp

Este proyecto usa 4 herramientas encadenadas. El objetivo de esta skill es
verificar que están bien configuradas y que el hook de pre-commit realmente
corre, no re-explicarlas.

## Componentes esperados

| Herramienta | Config                                 | Qué cubre                                                         |
| ----------- | -------------------------------------- | ----------------------------------------------------------------- |
| ESLint      | `eslint.config.js`                     | TS + templates Angular                                            |
| Stylelint   | `.stylelintrc.json`                    | CSS/SCSS (ignora `src/assets/styles/tokens/**`, son copia del DS) |
| Prettier    | `.prettierrc`                          | Formato general                                                   |
| Husky       | `.husky/pre-commit`                    | Corre `npx lint-staged`                                           |
| lint-staged | bloque `lint-staged` en `package.json` | Qué comando corre por extensión                                   |

## Checklist de verificación

1. `npx husky` instalado y `"prepare": "husky"` en `package.json` scripts —
   si falta, `npm run prepare`.
2. `.husky/pre-commit` existe y contiene `npx lint-staged` (no el default
   `npm test` que deja husky init).
3. Bloque `"lint-staged"` en `package.json` cubre `*.ts`, `*.html`,
   `*.{css,scss}` y pasa por `prettier --write` al final.
4. `.stylelintrc.json` tiene `ignoreFiles` apuntando a
   `src/assets/styles/tokens/**/*.css` — esos archivos son copia 1:1 del
   sistema de diseño (`../githubPagesProjectFinal/_ds/.../tokens/`), no se
   reformatean ni relintean con reglas propias del proyecto.
5. Correr en seco:
   ```
   npx ng lint
   npm run lint:css
   npx prettier --check .
   ```
   Si algo falla, arreglar el archivo señalado, no relajar la regla salvo
   que el usuario lo pida explícito.

## Si hay que reinstalar desde cero

```
npm install -D husky lint-staged stylelint stylelint-config-standard-scss
npx ng add @angular-eslint/schematics --skip-confirmation
npx husky init
```

Después de `husky init`, reemplazar el contenido default de
`.husky/pre-commit` (`npm test`) por `npx lint-staged`, y agregar el bloque
`lint-staged` de la tabla de arriba en `package.json`.

## Qué NO hacer

- No deshabilitar reglas de ESLint/Stylelint para "que pase" sin que el
  usuario lo pida — arreglar el código es la primera opción.
- No tocar `src/assets/styles/tokens/*.css` para satisfacer el linter: son
  fuente externa, van en `ignoreFiles`.
- No agregar Husky hooks adicionales (`pre-push`, `commit-msg`) sin que se
  pida — el scope actual es solo `pre-commit`.
