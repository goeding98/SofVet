-- Anular un consumo de la Prepagada (servicio facturado que no se hizo).
-- El consumo no se borra: queda marcado como anulado, con quién, cuándo, por qué
-- y el número de la nota crédito de Siigo. SofVet devuelve a la bolsa lo que
-- P&P había cubierto.
-- Correr una sola vez en Supabase → SQL Editor.

alter table prepagada_eventos
  add column if not exists anulado        boolean not null default false,
  add column if not exists anulado_por    text,
  add column if not exists anulado_fecha  timestamptz,
  add column if not exists anulado_motivo text,
  add column if not exists nota_credito   text;

NOTIFY pgrst, 'reload schema';
