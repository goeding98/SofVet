-- Agrega tipo 'unidad' y los insumos de hospital al inventario
-- Ejecutar en Supabase SQL Editor

-- 1. Ampliar el CHECK constraint para permitir tipo='unidad'
ALTER TABLE inventario DROP CONSTRAINT IF EXISTS inventario_tipo_check;
ALTER TABLE inventario ADD CONSTRAINT inventario_tipo_check
  CHECK (tipo IN ('ml', 'ampolla', 'unidad'));

-- 2. Insertar insumos (cantidades de prueba — actualizar con conteo real)
INSERT INTO inventario (nombre, tipo, ml_por_ampolla, stock, stock_minimo) VALUES
  ('Lactato Ringer',                        'unidad', NULL, 20,  5),
  ('Cloruro',                               'unidad', NULL, 15,  5),
  ('Dextrosa 50%',                          'unidad', NULL, 10,  3),
  ('Manitol (Osmorín)',                     'unidad', NULL,  8,  3),
  ('Jeringas 1ml a 10ml',                  'unidad', NULL, 100, 30),
  ('Jeringas 20ml',                         'unidad', NULL,  50, 15),
  ('Catéter 20G (Rosado)',                  'unidad', NULL,  20, 10),
  ('Catéter 22G (Azul)',                    'unidad', NULL,  20, 10),
  ('Catéter 24G (Amarillo)',               'unidad', NULL,  15,  5),
  ('Catéter 26G (Pediátrico Morado)',      'unidad', NULL,  10,  5),
  ('Buretrol',                              'unidad', NULL,  15,  5),
  ('Venoclisis Microgoteo',                 'unidad', NULL,  20, 10),
  ('Venoclisis Macrogoteo',                 'unidad', NULL,  20, 10),
  ('Tapones de Heparina',                   'unidad', NULL,  50, 20),
  ('Tubo tapa amarilla grande o pequeño',  'unidad', NULL,  30, 10),
  ('Tubo tapa roja grande o pequeño',      'unidad', NULL,  30, 10),
  ('Tubo tapa azul grande o pequeño',      'unidad', NULL,  30, 10),
  ('Tubo tapa verde grande o pequeño',     'unidad', NULL,  30, 10),
  ('Tubo tapa lila grande o pequeño',      'unidad', NULL,  30, 10),
  ('Sonda urinaria con estilete',           'unidad', NULL,  10,  3),
  ('Sonda urinaria sin estilete',           'unidad', NULL,  10,  3),
  ('Sonda Nelaton de 4 al 14',             'unidad', NULL,   8,  2),
  ('Tubo endotraqueal del 3 al 6.5',       'unidad', NULL,   8,  2),
  ('Recolector de orina/copro',             'unidad', NULL,  15,  5),
  ('Suturas absorbibles de 0-0 a la 5-0',  'unidad', NULL,  20,  5),
  ('Suturas no absorbibles de 0-0 a la 5-0','unidad',NULL,  15,  5),
  ('Suturas Nylon de 0-0 a la 5-0',        'unidad', NULL,  15,  5)
ON CONFLICT (nombre) DO NOTHING;

NOTIFY pgrst, 'reload schema';
