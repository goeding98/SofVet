CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  species VARCHAR(50) NOT NULL,
  breed VARCHAR(100),
  age INTEGER,
  weight DECIMAL(5,2),
  owner VARCHAR(150) NOT NULL,
  owner_phone VARCHAR(20),
  owner_email VARCHAR(100),
  status VARCHAR(30) DEFAULT 'activo',
  created_at DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_patients_species ON patients(species);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_owner ON patients(owner);

-- Datos de ejemplo
INSERT INTO patients (name, species, breed, age, weight, owner, owner_phone, owner_email, status, created_at) VALUES
('Luna', 'Perro', 'Golden Retriever', 3, 28.5, 'María García', '3001234567', 'maria@email.com', 'activo', '2024-01-15'),
('Michi', 'Gato', 'Persa', 5, 4.2, 'Carlos López', '3109876543', 'carlos@email.com', 'activo', '2024-02-20'),
('Rocky', 'Perro', 'Bulldog Francés', 2, 12.0, 'Ana Martínez', '3205551234', 'ana@email.com', 'hospitalizado', '2024-03-10'),
('Kira', 'Perro', 'Labrador', 7, 32.0, 'Pedro Sánchez', '3001112233', 'pedro@email.com', 'activo', '2024-01-05'),
('Toby', 'Conejo', 'Holland Lop', 1, 1.8, 'Laura Rodríguez', '3154445566', 'laura@email.com', 'activo', '2024-04-01')
ON CONFLICT DO NOTHING;
