# SofVet — Sistema Interno Veterinario Pets & Pets

## Qué es
Sistema de gestión clínica veterinaria interno para el staff de Pets & Pets (veterinarios, auxiliares, administración).

## Stack
- Frontend: React + Vite (en /frontend/)
- Backend: Node.js (en /backend/, poco usado — Supabase hace la mayoría)
- DB: Supabase (PostgreSQL + Storage)
- URL Supabase: https://lddksdszpwonsqaavjyd.supabase.co
- Deploy: Netlify

## Estructura
- /frontend/src/pages/ → Páginas principales
- /frontend/src/components/ → Componentes reutilizables  
- /frontend/src/utils/ → useStore, supabaseClient, useSede, useAuth
- /backend/ → Server Node.js (controllers, routes, models)
- /landing_santamonica/ → Landing pre-apertura sede Santa Mónica
- /scripts/ y /Datos_CJ/ → Scripts e importación de datos

## Autenticación y roles
- Login propio contra la tabla `sofvet_users` (no usa Supabase Auth). Sesión se guarda en localStorage (`sofvet_session`). Ver /frontend/src/utils/useAuth.jsx
- Roles: `Administrador`, `Médico`, `Auxiliar`, `Caja`, `Laboratorio`
- `Administrador` y `Laboratorio` no tienen sede fija (`sede_id: null`) — ven todas las sedes. Los demás roles están atados a una sede.
- El menú lateral (/frontend/src/components/Sidebar.jsx) muestra secciones distintas según rol y sede (ej. "Personal" solo para Admin o sede Colseguros; "Visitadora Médica/Remisiones" solo para Admin o sede Domicilio; sección "Administración" completa solo para Admin).

## Capa de datos
- Casi todo pasa por el hook `useStore(key)` en /frontend/src/utils/useStore.jsx, que mapea un `key` local a una tabla de Supabase, cachea en memoria (compartido entre componentes) y hace optimistic add/edit/remove.
- Tablas principales: clients, patients, appointments, clinical_history, consultations, vaccines, grooming, hospitalization, guardianship, remissions, eps, imaging, formulas_medicas, procedimientos, laboratorios, laboratorios_pedidos, prepagada, notas_clinicas, controles, inventario, visitas_hospitalizacion, imagenes, imagenes_pedidos, turnos, permisos_empleados, aliados, remisiones, grooming_desistentes, sofvet_users.
- El backend Node.js (/backend/) está prácticamente sin uso en operación diaria — el frontend habla directo con Supabase. Su único uso vivo es como servidor local de apoyo para /frontend/src/pages/ImportPage.jsx (importación histórica desde backups de Vetlogy, solo Admin).

## Funcionalidades (por módulo)
- **Dashboard** (`/`) — resumen general del sistema.
- **Clientes** (`/clients`, `/clients/:id`) — CRUD de tutores/clientes y sus mascotas asociadas.
- **Pacientes** (`/patients`, `/patients/:id`) — ficha de cada mascota: historia clínica, vacunas, procedimientos, labs, imágenes, hospitalizaciones, documentos.
- **Agenda** (`/appointments`) — citas (consulta general, control, etc.), vista semana/mes.
- **Peluquería** (`/grooming`) — agenda y gestión de servicios de grooming.
- **Hospitalización** (`/hospitalization`) — HospitalizationPage.jsx (~2200 líneas), el módulo más grande del sistema:
  - Ingreso, tratamiento (medicamentos con dosis/vía/frecuencia, con autocompletado desde catálogo interno), insumos, hoja de consumo, abonos/pagos parciales, traslados entre sedes, alta (cobrada/no cobrada), fallecimiento, deslinde (salida bajo responsabilidad del propietario).
  - Distingue hospitalización completa vs. semi-hospitalización.
  - Si `conectar_inventario` está activo en el registro, aplicar tratamiento descuenta stock automáticamente de `inventario` (maneja ml y ampollas) y registra el movimiento en `inventario_movimientos`.
  - Solo Admin o usuarios de sede Domicilio (id 4) ven todas las sedes; el resto ve solo la suya.
- **Visitas de Hospitalización** (`/visitas-hospitalizacion`) — VisitasPage.jsx: agenda tipo calendario semanal/día para que el staff registre y gestione visitas de tutores a pacientes hospitalizados (paciente, tutor, teléfono, sede, fecha, hora entrada/salida, o "llega después de las 9:00 PM" sin hora fija). Estados: pendiente/completada/cancelada. Guarda en tabla `visitas_hospitalizacion`.
  - **Los propios tutores pueden agendar esta visita ellos mismos desde el Portal del Cliente** (ver abajo) sin necesidad de login — el registro que crean ahí cae en la misma tabla `visitas_hospitalizacion` y aparece en VisitasPage.jsx para el staff.
- **Laboratorios** (`/laboratorios`) — solicitud y reporte de exámenes de laboratorio.
- **Imágenes** (`/imagenes`) — solicitud y resultados de estudios de imagenología.
- **Guardería** (`/petguardianship`) — mascotas en guardería.
- **Remisiones** (`/remissions`, `/remisiones`) — remisiones entre veterinarios/clínicas y remisiones de la visitadora médica (solo Admin o sede Domicilio).
- **EPS / Seguros** (`/eps`) — pólizas de mascotas.
- **Documentos** (`/documents`) — generación/impresión de documentos clínicos con firma digital.
- **Medicina Prepagada** (`/prepagada`) — afiliados a planes prepagados, estado al día/en mora.
- **Personal** (`/personal`, solo Admin o sede Colseguros) — turnos, permisos, vacaciones del staff.
- **Inventario** (`/inventario`, solo Admin) — stock, movimientos, se descuenta automáticamente desde Hospitalización y consultas (medicamentos).
- **Pedidos de Compra** (`/pedidos-compra`, solo Admin).
- **Facturación** (`/facturacion`, solo Admin, y solo visible para el usuario `goeding`).
- **Reportes** (`/reportes`, solo Admin) — actividad clínica por período y sede.
- **Usuarios** (`/users`, solo Admin) — gestión de cuentas del staff (rol, sede, contraseña).
- **Historias Clínicas / Certificados de Viaje** (`/hc-requests`, `/certificados-viaje`, solo Admin) — solicitudes que llegan desde el Portal del Cliente, con contador de pendientes en el sidebar.
- **Importar datos** (`/import`, solo Admin) — importación histórica desde Vetlogy (requiere backend Node local corriendo).

## Portal del Cliente
Existe un portal web para clientes/tutores en /frontend/src/pages/PortalPage.jsx (ruta `/portal`, no requiere sesión de staff).
Este portal es una ruta dentro de la misma app React — NO es la app nativa para clientes.
La app nativa es un proyecto separado que vive fuera de este repo.

Pantallas del portal (`portalView`): `choice` (elegir acción) → `login` (login con cédula/contraseña, hash SHA-256), `guest` (agendar cita como invitado sin login), `visita` (agendar visita de hospitalización), `cert` (solicitar certificado de viaje).
- **Login de cliente**: una vez logueado, ve sus mascotas con tabs por mascota: Resumen, Consultas, Procedimientos, Laboratorios, Imagenología, Hospitalización. Puede ver carnet de vacunación/desparasitación, estado de plan prepagado (afiliado/en mora), próximas citas.
- **Agendar cita como invitado**: flujo sin login (cédula, nombre, mascota, motivo, sede, fecha, hora) contra disponibilidad real de la agenda.
- **Agendar visita de hospitalización**: el tutor registra su visita a un paciente hospitalizado (nombre, teléfono, mascota, sede, fecha, hora o "después de 9:00 PM") — inserta directo en `visitas_hospitalizacion`, mismo módulo que gestiona el staff en `/visitas-hospitalizacion`. Aviso de seguridad: máximo 2 personas por visita.
- **Solicitar certificado de viaje**: formulario que cae en `certificados_viaje`, gestionado por Admin en `/certificados-viaje`.

## Sedes
- id: 1, Santa Mónica, #2e5cbf
- id: 2, Colseguros, #2e7d50  
- id: 3, Ciudad Jardín, #b8860b
- id: 4, Domicilio, #7c5cbf

## Regla de oro SQL
Después de cualquier cambio SQL: NOTIFY pgrst, 'reload schema';
