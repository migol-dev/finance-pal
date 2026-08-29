# Changelog

## [1.19.38] - 2026-08-28 (Security & Performance Audit)

### Security
- **CSP**: Implementada Política de Seguridad de Contenido (CSP) estricta.
- **RLS**: Se corrigieron las políticas de Row Level Security (RLS) en `push_subscriptions` y se establecieron vistas seguras (`accounts_safe`, `transactions_safe`, `debt_payments_safe`) en Supabase.
- **Network**: Se desactivó el tráfico en texto plano (cleartext) en Android.
- **Secrets**: Las claves VAPID ahora se gestionan de forma segura vía variables de entorno.
- **Auth**: Validación de fortaleza de contraseñas integrada en el registro.
- **Storage**: Implementado fallback seguro con advertencia visual para el almacenamiento cifrado cuando no hay soporte nativo.

### Bug Fixes
- Correcciones en el motor de sincronización (Sync Engine) y el manejo de persistencia offline.
- Resolución de inconsistencias de UI al sincronizar estados.

### Performance
- Optimización en el tiempo de carga y tamaño del bundle.
- Mejoras en la persistencia local de React Query.

### UX
- Manejo elegante de errores con avisos al usuario en caso de fallos de cifrado.

### Tests
- Activado el reporte de cobertura en las pruebas automatizadas (CI).

### Infrastructure
- **CI**: Actualizado el flujo de GitHub Actions para usar Node.js 20.
- **CI**: Añadido paso de seguridad con `npm audit --audit-level=high`.
- **Scripts**: Añadido `scripts/health-check.js` para validación rápida de calidad y seguridad local.
