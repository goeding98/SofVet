-- Agrega código interno (9001, 9002...) a cada ítem del inventario
-- Ejecutar en Supabase SQL Editor

ALTER TABLE inventario ADD COLUMN IF NOT EXISTS codigo integer UNIQUE;

-- Asigna 9001, 9002... en orden de inserción (por id)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
  FROM inventario
)
UPDATE inventario
SET codigo = 9000 + numbered.rn
FROM numbered
WHERE inventario.id = numbered.id;

NOTIFY pgrst, 'reload schema';
