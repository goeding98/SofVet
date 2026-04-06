CREATE TABLE IF NOT EXISTS clinical_history (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  patient_name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  vet VARCHAR(100),
  reason VARCHAR(255),
  diagnosis TEXT NOT NULL,
  treatment TEXT,
  observations TEXT,
  weight DECIMAL(5,2),
  temperature DECIMAL(4,1),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_patient ON clinical_history(patient_id);
CREATE INDEX IF NOT EXISTS idx_history_date ON clinical_history(date);

INSERT INTO clinical_history (patient_id, patient_name, date, vet, reason, diagnosis, treatment, observations, weight, temperature) VALUES
(1, 'Luna', '2026-03-01', 'Dr. Andrés Mora', 'Consulta de control', 'Paciente sano, en buen estado general', 'Vitaminas B-Complex', 'Peso estable, pelaje brillante', 28.5, 38.5),
(2, 'Michi', '2026-02-15', 'Dra. Sofía Rivas', 'Pérdida de apetito', 'Gastritis leve', 'Omeprazol 5mg/día por 7 días', 'Mejoría esperada en 48h', 4.0, 39.0),
(3, 'Rocky', '2026-03-15', 'Dr. Andrés Mora', 'Herida en pata delantera', 'Laceración superficial', 'Limpieza, antibiótico tópico, vendaje', 'Revisar en 5 días', 12.0, 38.8)
ON CONFLICT DO NOTHING;
