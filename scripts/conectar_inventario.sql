-- Agrega la columna que controla si una hospitalización descuenta inventario
ALTER TABLE hospitalization
  ADD COLUMN IF NOT EXISTS conectar_inventario boolean DEFAULT false;

NOTIFY pgrst, 'reload schema';
