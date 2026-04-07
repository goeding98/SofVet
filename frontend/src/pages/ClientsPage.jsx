import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../utils/useStore';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';

const EMPTY_CLIENT = { name: '', document: '', phone: '', email: '', address: '', notes: '' };
const EMPTY_PET    = { name: '', species: 'Perro', breed: '', age: '', weight: '', sex: 'Macho', esterilizado: 'No', caracter: 'Dócil', status: 'activo' };
const SPECIES      = ['Perro', 'Gato', 'Conejo', 'Ave', 'Reptil', 'Otro'];

const validatePet = (f) => {
  if (!f.name.trim() || !f.breed.trim() || !f.fecha_nacimiento || !f.weight || !f.sex || !f.esterilizado || !f.caracter) {
    alert('Por favor completa todos los campos requeridos.');
    return false;
  }
  return true;
};

const labelStyle = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem',
  textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text)',
};

export default function ClientsPage() {
  const navigate = useNavigate();
  const { items: clients, add: addClient, edit, remove } = useStore('clients');
  const { items: patients, add: addPet }                 = useStore('patients');

  // Client modal
  const [clientModal, setClientModal] = useState(false);
  const [clientForm, setClientForm]   = useState(EMPTY_CLIENT);
  const [editId, setEditId]           = useState(null);

  // "¿Agregar mascota?" dialog after client save
  const [askPet, setAskPet]           = useState(false);
  const [pendingClient, setPendingClient] = useState(null);

  // Pet modal (triggered from ask-pet dialog)
  const [petModal, setPetModal]       = useState(false);
  const [petForm, setPetForm]         = useState(EMPTY_PET);

  const [search, setSearch]           = useState('');

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.document || '').includes(search) ||
    (c.phone || '').includes(search)
  );

  // ── Client CRUD ──────────────────────────────────────────────
  const openAdd  = () => { setClientForm(EMPTY_CLIENT); setEditId(null); setClientModal(true); };
  const openEdit = (row) => { setClientForm({ ...row }); setEditId(row.id); setClientModal(true); };

  const handleSaveClient = async () => {
    if (!clientForm.name.trim())     return alert('El nombre es requerido.');
    if (!clientForm.document.trim()) return alert('La cédula / documento es requerida.');
    if (!clientForm.phone.trim())    return alert('El teléfono es requerido.');

    const payload = {
      ...clientForm,
      cedula:     clientForm.document || null,
      created_at: editId
        ? (clients.find(c => c.id === editId)?.created_at || new Date().toISOString().split('T')[0])
        : new Date().toISOString().split('T')[0],
    };

    if (editId) {
      edit(editId, payload);
      setClientModal(false);
    } else {
      let saveErr = null;
      const newClient = await addClient(payload, { onError: (m) => { saveErr = m; } });
      if (!newClient) { alert('❌ Error al guardar cliente:\n\n' + saveErr); return; }
      setClientModal(false);
      setPendingClient(newClient);
      setAskPet(true);
    }
  };

  const handleDelete = (row) => {
    const petCount = patients.filter(p => p.client_id === row.id).length;
    if (petCount > 0) {
      return alert(`No se puede eliminar a ${row.name} porque tiene ${petCount} mascota(s) registrada(s). Elimina primero sus mascotas.`);
    }
    if (confirm(`¿Eliminar al cliente ${row.name}?`)) remove(row.id);
  };

  // ── Ask-pet flow ──────────────────────────────────────────────
  const openPetForm = () => {
    if (!pendingClient) return;
    setPetForm(EMPTY_PET);
    setAskPet(false);
    setPetModal(true);
  };

  const dismissAskPet = () => {
    setAskPet(false);
    setPendingClient(null);
  };

  const handleSavePet = async () => {
    if (!validatePet(petForm)) return;
    const age = petForm.fecha_nacimiento
      ? Math.floor((new Date() - new Date(petForm.fecha_nacimiento)) / (365.25 * 24 * 3600 * 1000))
      : parseInt(petForm.age) || 0;
    let saveErr = null;
    const result = await addPet({
      ...petForm,
      client_id:   pendingClient.id,
      owner:       pendingClient.name,
      owner_phone: pendingClient.phone,
      owner_email: pendingClient.email,
      age,
      weight:      parseFloat(petForm.weight) || 0,
      created_at:  new Date().toISOString().split('T')[0],
    }, { onError: (m) => { saveErr = m; } });
    if (!result) { alert('❌ Error al guardar mascota:\n\n' + saveErr); return; }
    setPetModal(false);
    setPendingClient(null);
  };

  // ── Table columns ─────────────────────────────────────────────
  const petsOf = (clientId) => patients.filter(p => p.client_id === clientId);

  const columns = [
    { key: 'name', label: 'Cliente', render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>CC {row.document || '—'}</div>
      </div>
    )},
    { key: 'phone',   label: 'Teléfono',  render: v => v || '—' },
    { key: 'email',   label: 'Correo',    render: v => v || '—' },
    { key: 'address', label: 'Dirección', render: v => (
      <span style={{ maxWidth: 160, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v || '—'}</span>
    )},
    { key: 'id', label: 'Mascotas', render: (v) => {
      const count = petsOf(v).length;
      return (
        <button
          onClick={() => navigate(`/clients/${v}`)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            background: count > 0 ? 'var(--color-info-bg)' : 'var(--color-bg)',
            color: count > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)',
            border: `1px solid ${count > 0 ? 'var(--color-primary)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-full)', padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}
        >
          🐾 {count} {count === 1 ? 'mascota' : 'mascotas'}
        </button>
      );
    }},
    { key: 'created_at', label: 'Registro', render: v => (
      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{v}</span>
    )},
  ];

  // ── Form field helpers ────────────────────────────────────────
  const CF = (label, key, type = 'text') => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={clientForm[key] || ''} onChange={e => setClientForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '0.6rem 0.75rem' }} />
    </div>
  );

  const PF = (label, key, type = 'text', opts) => (
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
      <div className="page-header">
        <h1>Clientes</h1>
        <p>{clients.length} clientes registrados · {patients.length} mascotas en total</p>
      </div>

      {/* Search + add */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <input
            placeholder="Buscar por nombre, cédula o teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 220, padding: '0.6rem 1rem' }}
          />
          <Button onClick={openAdd} icon="+" variant="primary">Nuevo Cliente</Button>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          data={filtered}
          onEdit={openEdit}
          onDelete={handleDelete}
          emptyMessage="No hay clientes registrados. ¡Agrega el primero!"
        />
      </Card>

      {/* ── Create / Edit client modal ── */}
      <Modal
        isOpen={clientModal}
        onClose={() => setClientModal(false)}
        title={editId ? 'Editar Cliente' : 'Nuevo Cliente'}
        onSave={handleSaveClient}
        size="md"
      >
        <div className="grid-2">
          {CF('Nombre completo *', 'name')}
          {CF('Cédula / Documento *', 'document')}
          {CF('Teléfono *', 'phone', 'tel')}
          {CF('Correo electrónico *', 'email', 'email')}
        </div>
        {CF('Dirección *', 'address')}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Notas</label>
          <textarea
            value={clientForm.notes || ''}
            onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            style={{ width: '100%', padding: '0.6rem 0.75rem', resize: 'vertical' }}
          />
        </div>
      </Modal>

      {/* ── Ask: ¿Agregar mascota? ── */}
      {askPet && pendingClient && (
        <div
          onClick={dismissAskPet}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--color-white)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 420, overflow: 'hidden' }}
          >
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🐾</div>
              <h3 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-primary)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                ¡Cliente registrado!
              </h3>
              <p style={{ color: 'var(--color-text)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                <strong>{pendingClient.name}</strong> fue agregado exitosamente.
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                ¿Deseas registrar una mascota para este cliente ahora?
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <Button variant="ghost" onClick={dismissAskPet}>Ahora no</Button>
                <Button variant="primary" onClick={openPetForm}>Sí, agregar mascota</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pet modal (after ask-pet) ── */}
      <Modal
        isOpen={petModal}
        onClose={() => { setPetModal(false); setPendingClient(null); }}
        title={`Nueva mascota para ${pendingClient?.name || ''}`}
        onSave={handleSavePet}
        size="md"
      >
        {pendingClient && (
          <div style={{ background: 'var(--color-info-bg)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--color-primary)' }}>
            👤 Propietario: <strong>{pendingClient.name}</strong> · {pendingClient.phone}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
          {PF('Nombre *', 'name')}
          {PF('Especie', 'species', 'text', SPECIES)}
          {PF('Raza *', 'breed')}
          {PF('Sexo *', 'sex', 'text', ['Macho', 'Hembra'])}
          {PF('Fecha de nacimiento *', 'fecha_nacimiento', 'date')}
          {PF('Peso (kg) *', 'weight', 'number')}
          {PF('Esterilizado *', 'esterilizado', 'text', ['No', 'Sí'])}
          {PF('Carácter *', 'caracter', 'text', ['Dócil', 'Calmado', 'Nervioso', 'Agresivo'])}
        </div>
      </Modal>
    </div>
  );
}
