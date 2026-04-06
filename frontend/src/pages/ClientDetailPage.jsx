import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../utils/useStore';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';

const EMPTY_PET = { name: '', species: 'Perro', breed: '', age: '', weight: '', sex: 'Macho', esterilizado: 'No', caracter: 'Dócil', status: 'activo' };
const SPECIES = ['Perro', 'Gato', 'Conejo', 'Ave', 'Reptil', 'Otro'];

const validatePet = (f) => {
  if (!f.name.trim() || !f.breed.trim() || !f.age || !f.weight || !f.sex || !f.esterilizado || !f.caracter) {
    alert('Por favor completa todos los campos requeridos.');
    return false;
  }
  return true;
};
const speciesIcon = s => ({ Perro: '🐶', Gato: '🐱', Conejo: '🐰', Ave: '🐦', Reptil: '🦎' }[s] || '🐾');

const labelStyle = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem',
  textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text)',
};

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items: clients } = useStore('clients');
  const { items: patients, add: addPet } = useStore('patients');

  const [petModal, setPetModal] = useState(false);
  const [petForm, setPetForm] = useState(EMPTY_PET);

  const clientId = parseInt(id);
  const client = clients.find(c => c.id === clientId);
  const pets = patients.filter(p => p.client_id === clientId);

  if (!client) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Cliente no encontrado.</p>
        <Button onClick={() => navigate('/clients')}>← Volver a Clientes</Button>
      </div>
    );
  }

  const openPetModal = () => { setPetForm(EMPTY_PET); setPetModal(true); };

  const handleSavePet = () => {
    if (!validatePet(petForm)) return;
    const payload = {
      ...petForm,
      client_id: client.id,
      owner: client.name,
      owner_phone: client.phone,
      owner_email: client.email,
      age: parseInt(petForm.age) || 0,
      weight: parseFloat(petForm.weight) || 0,
      created_at: new Date().toISOString().split('T')[0],
    };
    addPet(payload);
    setPetModal(false);
  };

  const F = (label, key, type = 'text', opts) => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={labelStyle}>{label}</label>
      {opts
        ? <select value={petForm[key]} onChange={e => setPetForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '0.6rem 0.75rem' }}>
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        : <input type={type} value={petForm[key] || ''} onChange={e => setPetForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '0.6rem 0.75rem' }} />
      }
    </div>
  );

  return (
    <div>
      {/* Back nav */}
      <button
        onClick={() => navigate('/clients')}
        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'var(--font-body)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: 0 }}
      >
        ← Volver a Clientes
      </button>

      {/* Client info card */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: 'var(--radius-full)',
            background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '1.8rem', color: 'white' }}>👤</span>
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-primary)', fontSize: '1.5rem', marginBottom: '0.25rem' }}>
              {client.name}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              CC {client.document} · Registrado el {client.created_at}
            </p>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <InfoItem icon="📞" label="Teléfono" value={client.phone} />
              <InfoItem icon="✉️" label="Correo" value={client.email} />
              <InfoItem icon="📍" label="Dirección" value={client.address} />
              {client.notes && <InfoItem icon="📝" label="Notas" value={client.notes} />}
            </div>
          </div>

          {/* Stats */}
          <div style={{ textAlign: 'center', background: 'var(--color-info-bg)', borderRadius: 'var(--radius-md)', padding: '1rem 1.5rem', flexShrink: 0 }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-title)', color: 'var(--color-primary)' }}>{pets.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{pets.length === 1 ? 'mascota' : 'mascotas'}</div>
          </div>
        </div>
      </Card>

      {/* Pets section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-text)', fontSize: '1.15rem' }}>
          Mascotas de {client.name}
        </h3>
        <Button onClick={openPetModal} icon="+" variant="primary">Agregar mascota</Button>
      </div>

      {pets.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🐾</div>
            <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Este cliente aún no tiene mascotas registradas.</p>
            <p style={{ fontSize: '0.8rem' }}>Haz clic en <strong>"Agregar mascota"</strong> para comenzar.</p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {pets.map(pet => (
            <div
              key={pet.id}
              onClick={() => navigate(`/patients/${pet.id}`)}
              style={{
                background: 'var(--color-white)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sm)',
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'var(--transition)',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 'var(--radius-md)',
                background: 'var(--color-cream)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem', flexShrink: 0,
              }}>
                {speciesIcon(pet.species)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>{pet.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                  {pet.species} {pet.breed ? `· ${pet.breed}` : ''} · {pet.age} años · {pet.weight} kg
                </div>
                {pet.sex && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>{pet.sex}</div>
                )}
              </div>
              <span style={{
                background: pet.status === 'activo' ? 'var(--color-success-bg)' : pet.status === 'hospitalizado' ? 'var(--color-danger-bg)' : '#f5f5f5',
                color: pet.status === 'activo' ? 'var(--color-success)' : pet.status === 'hospitalizado' ? 'var(--color-danger)' : '#666',
                padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 500, whiteSpace: 'nowrap',
              }}>
                {pet.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add pet modal */}
      <Modal isOpen={petModal} onClose={() => setPetModal(false)} title="Agregar mascota" onSave={handleSavePet} size="md">
        <div style={{
          background: 'var(--color-info-bg)', border: '1px solid var(--color-primary)',
          borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem',
          fontSize: '0.85rem', color: 'var(--color-primary)',
        }}>
          👤 Propietario: <strong>{client.name}</strong> · {client.phone}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
          {F('Nombre *', 'name')}
          {F('Especie', 'species', 'text', SPECIES)}
          {F('Raza *', 'breed')}
          {F('Sexo *', 'sex', 'text', ['Macho', 'Hembra'])}
          {F('Edad (años) *', 'age', 'number')}
          {F('Peso (kg) *', 'weight', 'number')}
          {F('Esterilizado *', 'esterilizado', 'text', ['No', 'Sí'])}
          {F('Carácter *', 'caracter', 'text', ['Dócil', 'Calmado', 'Nervioso', 'Agresivo'])}
        </div>
        {F('Estado', 'status', 'text', ['activo', 'hospitalizado', 'inactivo'])}
      </Modal>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{icon} {label}</div>
      <div style={{ fontSize: '0.875rem', color: 'var(--color-text)', marginTop: '0.1rem' }}>{value}</div>
    </div>
  );
}
