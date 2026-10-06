-- Motivo obligatorio al mover una cita con especialista a "Desestimiento".
-- Las que ya están en esa columna quedan con el motivo vacío.
alter table citas_especialistas
  add column if not exists desestimiento_motivo text;

NOTIFY pgrst, 'reload schema';
