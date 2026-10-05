-- Incentivo por venta de Prepagada: quién afilió y cuántas pagaron.
-- Correr en Supabase → SQL Editor el día que se liquiden incentivos.
-- Solo cambiar el mes en la línea "mes".
--
-- Cuenta como venta una afiliación hecha en ese mes que ya tiene al menos un
-- pago (por link, tarjeta o caja). Las que siguen "Pendiente de pago" no
-- cuentan todavía; si pagan el mes siguiente, aparecen al volver a correrlo
-- para el mes en que se afiliaron.
-- "creado_por" es el usuario de SofVet con la sesión abierta al afiliar.

with params as (
  select date '2026-10-01' as mes          -- ← primer día del mes a liquidar
)
select
  a.creado_por                                        as vendedor,
  count(*) filter (where a.ultimo_pago_fecha is not null) as ventas_pagadas,
  count(*) filter (where a.ultimo_pago_fecha is null)     as pendientes_de_pago,
  count(*) filter (where a.ultimo_pago_fecha is not null and a.plan = 'total')     as pagadas_plan_total,
  count(*) filter (where a.ultimo_pago_fecha is not null and a.plan = 'urgencias') as pagadas_plan_urgencias
from prepagada_afiliados a, params p
where a.fecha_afiliacion >= p.mes
  and a.fecha_afiliacion <  p.mes + interval '1 month'
  and coalesce(a.creado_por, '') <> 'Migración v1→v2'
group by a.creado_por
order by ventas_pagadas desc;

-- Detalle, por si alguien pregunta por una venta puntual:
-- select a.id, a.creado_por, a.fecha_afiliacion, a.plan, a.estado, a.ultimo_pago_fecha,
--        c.name as tutor, p.name as mascota
-- from prepagada_afiliados a
-- left join clients c on c.id = a.client_id
-- left join patients p on p.id = a.patient_id
-- where a.fecha_afiliacion >= date '2026-10-01' and a.fecha_afiliacion < date '2026-11-01'
-- order by a.creado_por, a.fecha_afiliacion;
