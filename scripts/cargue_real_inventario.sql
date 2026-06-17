-- ══════════════════════════════════════════════════════════════════
-- CARGUE REAL DE INVENTARIO — Colseguros
-- Fuente: "Cargue inicial inventario.xlsx"
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- MEDICAMENTOS
UPDATE inventario SET stock = 30   WHERE nombre = 'COLIVET (DIPIRONA) X 50 ML';
UPDATE inventario SET stock = 5    WHERE nombre = 'MELOXICAM 0.5% X 10 ML';
UPDATE inventario SET stock = 107  WHERE nombre = 'MELOXICAME 2% X 50 ML';
UPDATE inventario SET stock = 0    WHERE nombre = 'DOMOSYN X 120 ML';
UPDATE inventario SET stock = 21   WHERE nombre = 'TRAMADOL AMPOLLA (2 ML)';
UPDATE inventario SET stock = 90   WHERE nombre = 'QUERCETOL X 50 ML';
UPDATE inventario SET stock = 170  WHERE nombre = 'DIURIVET X 50 ML';
UPDATE inventario SET stock = 10   WHERE nombre = 'KETOBEST X 50 ML';
UPDATE inventario SET stock = 90   WHERE nombre = 'VETHISTAM X 50 ML';
UPDATE inventario SET stock = 70   WHERE nombre = 'COMPLELAND X 100 ML';
UPDATE inventario SET stock = 120  WHERE nombre = 'OXITETRACICLINA X 100 ML';
UPDATE inventario SET stock = 0    WHERE nombre = 'BROXICLIN X 100 ML';
UPDATE inventario SET stock = 50   WHERE nombre = 'GLOMAX X 50 ML';
UPDATE inventario SET stock = 1400 WHERE nombre = 'AMINOLYTE X 500 ML';
UPDATE inventario SET stock = 150  WHERE nombre = 'UNITRAL X 100 ML';
UPDATE inventario SET stock = 58   WHERE nombre = 'GENTAMICINA AMPOLLA (2 ML)';
UPDATE inventario SET stock = 28   WHERE nombre = 'CLINDAMICINA AMPOLLA (4 ML)';
UPDATE inventario SET stock = 15   WHERE nombre = 'OMEPRAZOL AMPOLLA (10 ML)';
UPDATE inventario SET stock = 0    WHERE nombre = 'AMPICILINA AMPOLLA (5 ML)';
UPDATE inventario SET stock = 2    WHERE nombre = 'AMPICILINA + SULBACTAM AMPOLLA (5 ML)';
UPDATE inventario SET stock = 18   WHERE nombre = 'INFLACOR X 20 ML';
UPDATE inventario SET stock = 8    WHERE nombre = 'SEDOLAX X 10 ML';
UPDATE inventario SET stock = 52   WHERE nombre = 'ONDANSETRON AMPOLLA (4 ML)';
UPDATE inventario SET stock = 1    WHERE nombre = 'CEFALOTINA AMPOLLA (5 ML)';
UPDATE inventario SET stock = 4    WHERE nombre = 'CIPROFLOXACINA X 10 ML';
UPDATE inventario SET stock = 18   WHERE nombre = 'DEXAMETASONA AMPOLLA (2 ML)';
UPDATE inventario SET stock = 22   WHERE nombre = 'FLUIMUCIL AMPOLLA (3 ML)';
UPDATE inventario SET stock = 86   WHERE nombre = 'HIOSCINA AMPOLLA (1 ML)';
UPDATE inventario SET stock = 3    WHERE nombre = 'CEFTRIAXONA AMPOLLA (5 ML)';
UPDATE inventario SET stock = 26   WHERE nombre = 'METILPREDNISOLONA AMPOLLA (4 ML)';
UPDATE inventario SET stock = 8    WHERE nombre = 'AMIKACINA AMPOLLA (2 ML)';
UPDATE inventario SET stock = 33   WHERE nombre = 'METOCLOPRAMIDA AMPOLLA (2 ML)';
UPDATE inventario SET stock = 150  WHERE nombre = 'HEPATOGAN X 250 ML';
UPDATE inventario SET stock = 0    WHERE nombre = 'TRISEPTIL X 100 ML';
UPDATE inventario SET stock = 4100 WHERE nombre = 'METRONIDAZOL X 100 ML';
UPDATE inventario SET stock = 50   WHERE nombre = 'ENROFLOXACINA X 100 ML';
UPDATE inventario SET stock = 50   WHERE nombre = 'ERITROPOYETINA AMPOLLA (2 ML)';
UPDATE inventario SET stock = 80   WHERE nombre = 'ASCORVEX X 20 ML';
UPDATE inventario SET stock = 0    WHERE nombre = 'NEODOXIL INYEC X 50 ML';  -- ya no viene
UPDATE inventario SET stock = 65   WHERE nombre = 'RANIDIN X 20 ML';
UPDATE inventario SET stock = 72   WHERE nombre = 'KAVITEX 20/20 X 20 ML';
UPDATE inventario SET stock = 12   WHERE nombre = 'ACIDO TRANEXAMICO AMPOLLA (5 ML)';
UPDATE inventario SET stock = 99   WHERE nombre = 'CERENIA X 20 ML';
UPDATE inventario SET stock = 1495 WHERE nombre = 'PROPOFOL X 20 ML';
UPDATE inventario SET stock = 72   WHERE nombre = 'XILACINA X 20 ML';
UPDATE inventario SET stock = 41   WHERE nombre = 'DEXMEDETOMIDINA AMPOLLA (2 ML)';
UPDATE inventario SET stock = 8    WHERE nombre = 'DIAZEPAM AMPOLLA (2 ML)';
UPDATE inventario SET stock = 20   WHERE nombre = 'LIDOCAINA X 50 ML';
UPDATE inventario SET stock = 25   WHERE nombre = 'KETAMINA X 50 ML';
UPDATE inventario SET stock = 35   WHERE nombre = 'EUTHANEX X 50 ML';
UPDATE inventario SET stock = 175  WHERE nombre = 'ATROPINA X 50 ML';
UPDATE inventario SET stock = 27   WHERE nombre = 'PENTHAL X 20 ML';
UPDATE inventario SET stock = 37   WHERE nombre = 'TRANQUILAN X 10 ML';
UPDATE inventario SET stock = 170  WHERE nombre = 'BUPIVACAINA X 10 ML';
UPDATE inventario SET stock = 0    WHERE nombre = 'ROXICAINA X 100 ML';
UPDATE inventario SET stock = 10   WHERE nombre = 'ADRENALINA AMPOLLA (1 ML)';
UPDATE inventario SET stock = 0    WHERE nombre = 'CLORURO DE POTASIO X 10 ML';
UPDATE inventario SET stock = 12   WHERE nombre = 'RESUPRAM X 10 ML';
UPDATE inventario SET stock = 120  WHERE nombre = 'FENTANILO X 10 ML';
UPDATE inventario SET stock = 54   WHERE nombre = 'MIDAZOLAN AMPOLLA (5 ML)';
UPDATE inventario SET stock = 7    WHERE nombre = 'ZOLETIL X 5 ML';
UPDATE inventario SET stock = 0    WHERE nombre = 'RESTADERM X 100 ML';
UPDATE inventario SET stock = 0    WHERE nombre = 'BRONQUIVET';
UPDATE inventario SET stock = 6    WHERE nombre = 'REMIFENTANILO AMPOLLA (1 ML)';
UPDATE inventario SET stock = 30   WHERE nombre = 'GLUCONATO DE CALCIO 10% (10 ML)';

-- INSUMOS
UPDATE inventario SET stock = 58   WHERE nombre = 'Lactato Ringer';
UPDATE inventario SET stock = 68   WHERE nombre = 'Cloruro';
UPDATE inventario SET stock = 1    WHERE nombre = 'Dextrosa 50%';
UPDATE inventario SET stock = 9    WHERE nombre = 'Manitol (Osmorín)';
UPDATE inventario SET stock = 763  WHERE nombre = 'Jeringas 1ml a 10ml';
UPDATE inventario SET stock = 39   WHERE nombre = 'Jeringas 20ml';
UPDATE inventario SET stock = 38   WHERE nombre = 'Catéter 20G (Rosado)';
UPDATE inventario SET stock = 114  WHERE nombre = 'Catéter 22G (Azul)';
UPDATE inventario SET stock = 138  WHERE nombre = 'Catéter 24G (Amarillo)';
UPDATE inventario SET stock = 102  WHERE nombre = 'Catéter 26G (Pediátrico Morado)';
UPDATE inventario SET stock = 40   WHERE nombre = 'Buretrol';
UPDATE inventario SET stock = 25   WHERE nombre = 'Venoclisis Microgoteo';
UPDATE inventario SET stock = 30   WHERE nombre = 'Venoclisis Macrogoteo';
UPDATE inventario SET stock = 135  WHERE nombre = 'Tapones de Heparina';
UPDATE inventario SET stock = 130  WHERE nombre = 'Tubo tapa amarilla grande o pequeño';
UPDATE inventario SET stock = 172  WHERE nombre = 'Tubo tapa roja grande o pequeño';
UPDATE inventario SET stock = 130  WHERE nombre = 'Tubo tapa azul grande o pequeño';
UPDATE inventario SET stock = 4    WHERE nombre = 'Tubo tapa verde grande o pequeño';
UPDATE inventario SET stock = 200  WHERE nombre = 'Tubo tapa lila grande o pequeño';
UPDATE inventario SET stock = 13   WHERE nombre = 'Sonda urinaria con estilete';
UPDATE inventario SET stock = 6    WHERE nombre = 'Sonda urinaria sin estilete';
UPDATE inventario SET stock = 68   WHERE nombre = 'Sonda Nelaton de 4 al 14';
UPDATE inventario SET stock = 88   WHERE nombre = 'Tubo endotraqueal del 3 al 6.5';
UPDATE inventario SET stock = 55   WHERE nombre = 'Recolector de orina/copro';
UPDATE inventario SET stock = 206  WHERE nombre = 'Suturas absorbibles de 0-0 a la 5-0';
UPDATE inventario SET stock = 92   WHERE nombre = 'Suturas no absorbibles de 0-0 a la 5-0';
UPDATE inventario SET stock = 0    WHERE nombre = 'Suturas Nylon de 0-0 a la 5-0';

-- Conectar hospitalizaciones activas de Colseguros al inventario
UPDATE hospitalization
SET conectar_inventario = true
WHERE sede_id = 2 AND status = 'activo';

NOTIFY pgrst, 'reload schema';
