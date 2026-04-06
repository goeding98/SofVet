CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
  patient_name VARCHAR(100) NOT NULL,
  owner VARCHAR(150),
  vet VARCHAR(100),
  service VARCHAR(100),
  date DATE NOT NULL,
  time TIME NOT NULL,
  status VARCHAR(30) DEFAULT 'pendiente',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

INSERT INTO appointments (patient_id, patient_name, owner, vet, service, date, time, status, notes) VALUES
(1, 'Luna', 'María García', 'Dr. Andrés Mora', 'Consulta General', '2026-03-28', '09:00', 'confirmada', 'Control rutinario'),
(2, 'Michi', 'Carlos López', 'Dra. Sofía Rivas', 'Vacunación', '2026-03-28', '10:30', 'pendiente', 'Refuerzo anual'),
(3, 'Rocky', 'Ana Martínez', 'Dr. Andrés Mora', 'Cirugía', '2026-03-29', '08:00', 'confirmada', 'Esterilización'),
(4, 'Kira', 'Pedro Sánchez', 'Dra. Sofía Rivas', 'Peluquería', '2026-03-29', '14:00', 'pendiente', '')
ON CONFLICT DO NOTHING;
