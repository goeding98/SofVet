-- Cobro mensual automático de la Prepagada.
-- Creado en producción el 2026-10-05 desde el SQL Editor de Supabase. Este
-- archivo es solo el registro: correrlo de nuevo crearía una segunda tarea.
--
-- Todos los días a las 8:00 a.m. hora Colombia (13:00 UTC) llama a la Edge
-- Function wompi-cobrar-recurrente con { todos: true }, que cobra a los
-- afiliados con tarjeta cuyo vencimiento ya pasó. La función no cobra dos veces
-- el mismo día a la misma tarjeta y reintenta al día siguiente las rechazadas.
-- Como todos vencen el último día del mes, el grueso de los cobros cae el día 1.
--
-- Ver la tarea:    select jobid, jobname, schedule, active from cron.job;
-- Ver ejecuciones: select * from cron.job_run_details order by start_time desc limit 10;
-- Ver respuestas:  select status_code, content from net._http_response order by id desc limit 5;
-- Pausarla:        select cron.alter_job(job_id := <jobid>, active := false);

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'prepagada-cobro-mensual',
  '0 13 * * *',
  $$
  select net.http_post(
    url     := 'https://lddksdszpwonsqaavjyd.supabase.co/functions/v1/wompi-cobrar-recurrente',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{"todos": true}'::jsonb
  );
  $$
);

NOTIFY pgrst, 'reload schema';
