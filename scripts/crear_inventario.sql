-- ══════════════════════════════════════════════════════════════════
-- MÓDULO DE INVENTARIO — SofVet
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- 1. Tabla principal de inventario
CREATE TABLE IF NOT EXISTS inventario (
  id            serial PRIMARY KEY,
  nombre        text NOT NULL UNIQUE,
  tipo          text NOT NULL CHECK (tipo IN ('ml', 'ampolla')),
  ml_por_ampolla numeric,          -- solo para tipo='ampolla'
  stock         numeric NOT NULL DEFAULT 0,
  stock_minimo  numeric NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 2. Tabla de movimientos (log de cada ingreso / descargue)
CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id             serial PRIMARY KEY,
  inventario_id  int NOT NULL REFERENCES inventario(id),
  tipo           text NOT NULL,   -- 'ingreso' | 'descargue_manual' | 'descargue_hosp'
  cantidad       numeric NOT NULL, -- positivo = ingreso, negativo = descargue
  motivo         text,
  created_by     text,
  hosp_id        int,             -- para descargue_hosp (futuro)
  created_at     timestamptz DEFAULT now()
);

-- 3. RLS permissivo (app usa anon key)
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventario_all" ON inventario;
DROP POLICY IF EXISTS "inventario_mov_all" ON inventario_movimientos;

CREATE POLICY "inventario_all" ON inventario FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "inventario_mov_all" ON inventario_movimientos FOR ALL USING (true) WITH CHECK (true);

-- 4. Datos iniciales (cantidades de prueba — se actualizan con el conteo real)
-- ─── Bajar exacto: stock en ML ────────────────────────────────────────────────
INSERT INTO inventario (nombre, tipo, ml_por_ampolla, stock, stock_minimo) VALUES
  ('ACIDO TRANEXAMICO AMPOLLA (5 ML)',         'ampolla', 5,    10,  5),
  ('ADRENALINA AMPOLLA (1 ML)',                 'ml',      NULL, 15,  5),
  ('AMIKACINA AMPOLLA (2 ML)',                  'ampolla', 2,    15,  5),
  ('AMINOLYTE X 500 ML',                        'ml',      NULL, 1000, 500),
  ('AMPICILINA AMPOLLA (5 ML)',                 'ampolla', 5,    20,  5),
  ('AMPICILINA + SULBACTAM AMPOLLA (5 ML)',     'ampolla', 5,    15,  5),
  ('ASCORVEX X 20 ML',                          'ml',      NULL, 60,  20),
  ('ATROPINA X 50 ML',                          'ml',      NULL, 100, 50),
  ('BRONQUIVET',                                'ml',      NULL, 50,  20),
  ('BROXICLIN X 100 ML',                        'ml',      NULL, 200, 100),
  ('BUPIVACAINA X 10 ML',                       'ml',      NULL, 30,  10),
  ('CEFALOTINA AMPOLLA (5 ML)',                 'ampolla', 5,    20,  5),
  ('CERENIA X 20 ML',                           'ml',      NULL, 40,  20),
  ('CEFTRIAXONA AMPOLLA (5 ML)',                'ampolla', 5,    20,  5),
  ('CIPROFLOXACINA X 10 ML',                    'ml',      NULL, 50,  10),
  ('CLINDAMICINA AMPOLLA (4 ML)',               'ampolla', 4,    15,  5),
  ('CLORURO DE POTASIO X 10 ML',               'ml',      NULL, 50,  10),
  ('COLIVET (DIPIRONA) X 50 ML',               'ml',      NULL, 150, 50),
  ('COMPLELAND X 100 ML',                       'ml',      NULL, 200, 100),
  ('DEXAMETASONA AMPOLLA (2 ML)',               'ampolla', 2,    20,  5),
  ('DEXMEDETOMIDINA AMPOLLA (2 ML)',            'ampolla', 2,    8,   5),
  ('DIAZEPAM AMPOLLA (2 ML)',                   'ampolla', 2,    10,  5),
  ('DIURIVET X 50 ML',                          'ml',      NULL, 100, 50),
  ('DOMOSYN X 120 ML',                          'ml',      NULL, 240, 120),
  ('ENROFLOXACINA X 100 ML',                    'ml',      NULL, 300, 100),
  ('ERITROPOYETINA AMPOLLA (2 ML)',             'ampolla', 2,    10,  5),
  ('EUTHANEX X 50 ML',                          'ml',      NULL, 50,  50),
  ('FENTANILO X 10 ML',                         'ml',      NULL, 30,  10),
  ('FLUIMUCIL AMPOLLA (3 ML)',                  'ampolla', 3,    10,  5),
  ('GENTAMICINA AMPOLLA (2 ML)',                'ampolla', 2,    15,  5),
  ('GLUCONATO DE CALCIO 10% (10 ML)',           'ml',      NULL, 50,  10),
  ('HEPATOGAN X 250 ML',                        'ml',      NULL, 500, 250),
  ('HIOSCINA AMPOLLA (1 ML)',                   'ml',      NULL, 15,  5),
  ('INFLACOR X 20 ML',                          'ml',      NULL, 60,  20),
  ('KAVITEX 20/20 X 20 ML',                     'ml',      NULL, 40,  20),
  ('KETAMINA X 50 ML',                          'ml',      NULL, 150, 50),
  ('KETOBEST X 50 ML',                          'ml',      NULL, 100, 50),
  ('LIDOCAINA X 50 ML',                         'ml',      NULL, 100, 50),
  ('MELOXICAM 0.5% X 10 ML',                   'ml',      NULL, 40,  10),
  ('MELOXICAME 2% X 50 ML',                     'ml',      NULL, 100, 50),
  ('METILPREDNISOLONA AMPOLLA (4 ML)',          'ampolla', 4,    10,  5),
  ('METOCLOPRAMIDA AMPOLLA (2 ML)',             'ampolla', 2,    15,  5),
  ('METRONIDAZOL X 100 ML',                     'ml',      NULL, 300, 100),
  ('MIDAZOLAN AMPOLLA (5 ML)',                  'ampolla', 5,    10,  5),
  ('NEODOXIL INYEC X 50 ML',                   'ml',      NULL, 100, 50),
  ('OMEPRAZOL AMPOLLA (10 ML)',                 'ml',      NULL, 60,  10),
  ('ONDANSETRON AMPOLLA (4 ML)',                'ampolla', 4,    15,  5),
  ('OXITETRACICLINA X 100 ML',                  'ml',      NULL, 300, 100),
  ('PENTHAL X 20 ML',                           'ml',      NULL, 40,  20),
  ('PROPOFOL X 20 ML',                          'ml',      NULL, 60,  20),
  ('QUERCETOL X 50 ML',                         'ml',      NULL, 150, 50),
  ('RANIDIN X 20 ML',                           'ml',      NULL, 60,  20),
  ('REMIFENTANILO AMPOLLA (1 ML)',              'ml',      NULL, 5,   2),
  ('RESUPRAM X 10 ML',                          'ml',      NULL, 20,  10),
  ('RESTADERM X 100 ML',                        'ml',      NULL, 200, 100),
  ('ROXICAINA X 100 ML',                        'ml',      NULL, 200, 100),
  ('SEDOLAX X 10 ML',                           'ml',      NULL, 40,  10),
  ('TRAMADOL AMPOLLA (2 ML)',                   'ampolla', 2,    20,  5),
  ('TRANQUILAN X 10 ML',                        'ml',      NULL, 30,  10),
  ('TRISEPTIL X 100 ML',                        'ml',      NULL, 200, 100),
  ('UNITRAL X 100 ML',                          'ml',      NULL, 300, 100),
  ('VETHISTAM X 50 ML',                         'ml',      NULL, 100, 50),
  ('XILACINA X 20 ML',                          'ml',      NULL, 80,  20),
  ('GLOMAX X 50 ML',                            'ml',      NULL, 100, 50),
  ('ZOLETIL X 5 ML',                            'ml',      NULL, 15,  5)
ON CONFLICT (nombre) DO NOTHING;

NOTIFY pgrst, 'reload schema';
