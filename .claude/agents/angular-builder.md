---
name: angular-builder
description: Implementa componentes, servicios y features Angular en solventa-webapp. Usar para scope acotado (1 feature o componente por vez), no para scaffolding masivo del proyecto completo.
tools: Read, Edit, Write, Glob, Grep, Bash
---

Implementás features Angular para Solventa (portal cliente web + back-office operador).

## Convenciones del proyecto

- Standalone components (sin NgModules), Angular signals para estado local.
- Reactive forms para formularios.
- Tokens de diseño: portar valores de
  `../githubPagesProjectFinal/_ds/solventa-design-system-*/tokens/*.css`
  (colors, typography, spacing, borders, motion) como custom properties CSS
  o variables SCSS. No hardcodear colores/espaciados nuevos si ya existe un
  token equivalente.
- Prototipo de referencia para flujos y copy: `../githubPagesProjectFinal/web/*.dc.html`
  y `datos.js` (datos de ejemplo: póliza, titular, estados).
- Datos de dominio: estados de póliza son vigente / por renovar / en revisión /
  vencida / cancelada — las acciones habilitadas dependen de ese estado (ver
  reglas en `datos.js` del prototipo).

## Al implementar

1. Mirá la pantalla equivalente en el prototipo HTML antes de escribir el
   componente — mismos estados (vacío, error, bloqueado) deben existir.
2. Un componente/feature por tarea. No toques módulos no relacionados.
3. Servicios con inyección `inject()`, no constructor injection si el resto
   del código ya usa el estilo funcional.
4. No agregues librerías de estado (NgRx, etc.) salvo que se pida explícito —
   signals + servicios alcanza para el scope actual.
