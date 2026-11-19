import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

const rutasAutenticadas: Record<string, RegExp[]> = {
  GET: [
    /^\/clientes\/[^/]+\/perfil$/,
    /^\/clientes\/[^/]+\/verificaciones-kyc-aml\/[^/]+$/,
    /^\/consentimientos$/,
    /^\/cotizaciones\/[^/]+(?:\/(?:condiciones|firma-digital|poliza|resumen-pago))?$/,
    /^\/polizas\/(?:mis-polizas|[^/]+(?:\/certificado(?:\/descarga)?)?)$/,
    /^\/pagos\/[^/]+$/,
    /^\/auditoria-emision$/,
    /^\/socios(?:\/[^/]+\/api-keys(?:\/[^/]+)?)?$/,
  ],
  POST: [
    /^\/clientes\/[^/]+\/verificaciones-kyc-aml$/,
    /^\/cotizaciones(?:\/[^/]+\/(?:condiciones\/decisiones|firma-digital))?$/,
    /^\/pagos$/,
    /^\/socios(?:\/[^/]+\/api-keys)?$/,
  ],
  PUT: [/^\/clientes\/[^/]+\/consentimiento$/],
  DELETE: [/^\/socios\/[^/]+\/api-keys\/[^/]+$/],
};

export const bffAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const base = new URL(environment.apiUrl, globalThis.location.origin);
  const url = new URL(req.url, globalThis.location.origin);
  const prefix = `${base.pathname.replace(/\/$/, '')}/`;
  const ruta = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length - 1) : '';

  if (
    url.origin !== base.origin ||
    !rutasAutenticadas[req.method]?.some((patron) => patron.test(ruta)) ||
    req.headers.has('Authorization')
  ) {
    return next(req);
  }

  const token = inject(AuthService).token;
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
};
