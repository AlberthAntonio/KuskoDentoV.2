# Solucion aplicada: Historial del paciente

Fecha: 2026-03-31
Alcance: Pantalla de detalle de paciente y carga de historial.

## Problema observado

Al abrir el historial del paciente, la consola mostraba advertencias repetidas de metodos deprecados:

- db.getById('patients', ...)
- db.getAll('payments')
- db.getAll('appointments')
- db.getAll('radiographs')
- db.getAll('consents')
- db.getAll('odontograms')

Esto ocurria porque la vista seguia usando src/lib/db.ts (capa legacy).

## Causa raiz

La pagina src/app/patients/[id]/page.tsx cargaba datos con db.getAll/db.getById, aunque ya existen endpoints REST para pacientes, pagos y citas.

## Solucion implementada

Se migro la carga principal del historial a fetch directo contra API:

1. Paciente: GET /api/patients/:id
2. Pagos: GET /api/payments?patient_id=:id
3. Citas: GET /api/appointments (filtrado por paciente en cliente)

Tambien se agrego en la pagina:

- Normalizacion de respuestas API (envelope success/data/error).
- Mapeo de estructuras modernas a tipos legacy de la UI.
- Normalizacion de montos y fechas.
- Manejo de errores con toast destructivo.

Para modulos sin endpoint REST actual (radiografias, consentimientos, odontogramas), se dejo inicializacion vacia en la carga principal para evitar llamadas deprecadas repetitivas durante la apertura del historial.

## Archivos modificados

- src/app/patients/[id]/page.tsx

## Resultado esperado

- Se elimina el spam de warnings de db.getById/db.getAll al abrir historial del paciente.
- La seccion de pagos/saldos y la agenda historica se alimentan desde API actual.
- Mejor consistencia con backend multi-tenant y menor riesgo de ruptura futura.

## Riesgos y deuda pendiente

1. Aun existe uso de db.put/db.delete en subida/eliminacion de radiografias y consentimientos (acciones legacy).
2. No hay endpoints REST activos para radiografias, consentimientos y odontogramas en src/app/api.
3. Para eliminar completamente la dependencia legacy en esta pantalla, se requiere crear esos endpoints y migrar esas acciones a useMutation/fetch.

## Siguiente paso recomendado

Implementar en backend:

1. GET/POST/DELETE de radiografias.
2. GET/POST/DELETE de consentimientos.
3. GET/POST de odontogramas por paciente.

Luego, actualizar la misma pagina para quitar todo uso remanente de src/lib/db.ts.
