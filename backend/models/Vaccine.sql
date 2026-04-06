CREATE TABLE IF NOT EXISTS vaccines (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  patient_name VARCHAR(100) NOT NULL,
  vaccine_name VARCHAR(100) NOT NULL,
  dose VARCHAR(50),
  date_applied DATE NOT NULL,
  next_dose DATE,
  vet VARCHAR(100),
  batch VARCHAR(50),
  status VARCHAR(30) DEFAULT 'vigente',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vaccines_patient ON vaccines(patient_id);
CREATE INDEX IF NOT EXISTS idx_vaccines_status ON vaccines(status);
CREATE INDEX IF NOT EXISTS idx_vaccines_next_dose ON vaccines(next_dose);

INSERT INTO vaccines (patient_id, patient_name, vaccine_name, dose, date_applied, next_dose, vet, batch, status) VALUES
(1, 'Luna', 'Parvovirus', '1ra dosis', '2026-01-10', '2026-04-10', 'Dr. Andrés Mora', 'LOT-2024-001', 'vigente'),
(1, 'Luna', 'Rabia', 'Anual', '2026-01-10', '2027-01-10', 'Dr. Andrés Mora', 'LOT-2024-002', 'vigente'),
(2, 'Michi', 'Triple Felina', 'Refuerzo', '2025-12-05', '2026-12-05', 'Dra. Sofía Rivas', 'LOT-2024-003', 'vigente'),
(3, 'Rocky', 'Moquillo', '1ra dosis', '2025-10-20', '2026-04-20', 'Dr. Andrés Mora', 'LOT-2024-004', 'próximo')
ON CONFLICT DO NOTHING;
