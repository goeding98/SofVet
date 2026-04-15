import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../utils/useStore';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';

const EMPTY_PET = { name: '', species: 'Perro', breed: '', age: '', weight: '', sex: 'Macho', esterilizado: 'No', caracter: 'Dócil', status: 'activo', client_id: '', owner: '', owner_phone: '', owner_email: '' };

const validatePet = (f) => {
  if (!f.name.trim() || !f.breed.trim() || !f.fecha_nacimiento || !f.weight || !f.sex || !f.esterilizado || !f.caracter) {
    alert('Por favor completa todos los campos requeridos.');
    return false;
  }
  return true;
};

const speciesIcon = s => ({ Perro: '🐶', Gato: '🐱', Conejo: '🐰', Ave: '🐦', Reptil: '🦎' }[s] || '🐾');

const badge = (status) => {
  const map = { activo: ['#e8f5ee', '#2e7d50'], hospitalizado: ['#fdecea', '#c0392b'], inactivo: ['#f5f5f5', '#666'] };
  const [bg, color] = map[status] || ['#eee', '#555'];
  return <span style={{ background: bg, color, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 500 }}>{status}</span>;
};

export default function PatientsPage() {
  const navigate = useNavigate();
  const { items: clients }                        = useStore('clients');
  const { items: patients, add, edit, remove }    = useStore('patients');

  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(EMPTY_PET);
  const [editId, setEditId]   = useState(null);
  const [search, setSearch]   = useState('');
  const [filterClient, setFilterClient] = useState('');

  // When a client is selected from the dropdown, auto-fill owner info
  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === parseInt(clientId));
    if (client) {
      setForm(f => ({
        ...f,
        client_id:   client.id,
        owner:       client.name,
        owner_phone: client.phone || '',
        owner_email: client.email || '',
      }));
    } else {
      setForm(f => ({ ...f, client_id: '', owner: '', owner_phone: '', owner_email: '' }));
    }
  };

  const filtered = patients.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.owner || '').toLowerCase().includes(search.toLowerCase());
    const matchClient = !filterClient || p.client_id === parseInt(filterClient);
    return matchSearch && matchClient;
  });

  const openAdd = () => {
    if (clients.length === 0) {
      return alert('Primero debes registrar un cliente en la sección "Clientes" antes de agregar mascotas.');
    }
    setForm(EMPTY_PET);
    setEditId(null);
    setModal(true);
  };

  const openEdit = (row) => {
    setForm({ ...row });
    setEditId(row.id);
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.client_id) return alert('Debes seleccionar un cliente propietario.');
    if (!validatePet(form)) return;
    const age = form.fecha_nacimiento
      ? Math.floor((new Date() - new Date(form.fecha_nacimiento)) / (365.25 * 24 * 3600 * 1000))
      : parseInt(form.age) || 0;

    // Auto-assign next no_historia for new patients
    let no_historia = form.no_historia;
    if (!editId && !no_historia) {
      const maxNum = patients.reduce((max, p) => {
        const n = parseInt(p.no_historia || '0', 10);
        return n > max ? n : max;
      }, 0);
      no_historia = String(maxNum + 1);
    }

    const payload = {
      ...form,
      age,
      weight:   parseFloat(form.weight) || 0,
      no_historia,
      created_at: editId
        ? (patients.find(p => p.id === editId)?.created_at || new Date().toISOString().split('T')[0])
        : new Date().toISOString().split('T')[0],
    };

    if (editId) {
      edit(editId, payload);
    } else {
      const result = await add(payload);
      // If Supabase didn't return no_historia (ignored on INSERT), force it via UPDATE
      if (result && !result.no_historia && no_historia) {
        edit(result.id, { no_historia });
      }
    }
    setModal(false);
  };

  const handleDelete = (row) => {
    if (confirm(`¿Eliminar a ${row.name}?`)) remove(row.id);
  };

  const columns = [
    { key: 'no_historia', label: 'HC', render: v => (
      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', color: 'var(--color-primary)', background: 'var(--color-info-bg)', padding: '2px 7px', borderRadius: 6 }}>
        #{v || '—'}
      </span>
    )},
    { key: 'name', label: 'Mascota', render: (v, row) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.3rem' }}>{speciesIcon(row.species)}</span>
        <div>
          <button
            onClick={() => navigate(`/patients/${row.id}`)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-primary)', textDecoration: 'underline' }}
          >
            {v}
          </button>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{row.breed || 'Sin raza'}</div>
        </div>
      </div>
    )},
    { key: 'species', label: 'Especie' },
    { key: 'age',     label: 'Edad',   render: v => `${v} años` },
    { key: 'weight',  label: 'Peso',   render: v => `${v} kg`   },
    { key: 'owner',   label: 'Propietario', render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{row.owner_phone}</div>
      </div>
    )},
    { key: 'status', label: 'Estado', render: v => badge(v) },
  ];

  // Input helper
  const F = (label, key, type = 'text', opts) => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text)' }}>
        {label}
      </label>
      {opts
        ? <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '0.6rem 0.75rem' }}>
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        : <input type={type} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '0.6rem 0.75rem' }} />
      }
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Pacientes</h1>
        <p>{patients.length} mascotas registradas · {patients.filter(p => p.status === 'activo').length} activas</p>
      </div>

      {/* Search bar */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flex: 1, flexWrap: 'wrap' }}>
            <input
              placeholder="Buscar por nombre o propietario..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 180, padding: '0.6rem 1rem' }}
            />
            <select
              value={filterClient}
              onChange={e => setFilterClient(e.target.value)}
              style={{ padding: '0.6rem 0.75rem', minWidth: 180 }}
            >
              <option value="">Todos los clientes</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <Button onClick={openAdd} icon="+" variant="primary">Nueva Mascota</Button>
        </div>
      </Card>

      {/* No clients warning */}
      {clients.length === 0 && (
        <div style={{
          background: 'var(--color-warning-bg)',
          border: '1px solid var(--color-warning)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          color: 'var(--color-warning)',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          ⚠️ <span>Para agregar mascotas primero debes registrar un <strong>Cliente</strong> en el menú lateral.</span>
        </div>
      )}

      <Card>
        <Table
          columns={columns}
          data={filtered}
          onEdit={openEdit}
          onDelete={handleDelete}
          emptyMessage="No hay mascotas registradas. Selecciona un cliente y agrégale una."
        />
      </Card>

      {/* Modal */}
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title={editId ? 'Editar Mascota' : 'Nueva Mascota'}
        onSave={handleSave}
        size="md"
      >
        {/* Step 1: Select client */}
        <div style={{
          background: 'var(--color-info-bg)',
          border: '1px solid var(--color-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          marginBottom: '1.25rem',
        }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>
            Propietario / Cliente *
          </label>
          <select
            value={form.client_id || ''}
            onChange={e => handleClientChange(e.target.value)}
            disabled={!!editId}
            style={{ width: '100%', padding: '0.65rem 0.85rem', fontWeight: 500, borderColor: 'var(--color-primary)' }}
          >
            <option value="">— Selecciona un cliente —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `· ${c.phone}` : ''}
              </option>
            ))}
          </select>
          {form.owner && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-primary)' }}>
              ✓ {form.owner} · {form.owner_phone} · {form.owner_email}
            </div>
          )}
        </div>

        {/* Step 2: Pet info */}
        <div className="grid-2">
          {F('Nombre de la mascota *', 'name')}
          {F('Especie', 'species', 'text', ['Perro', 'Gato', 'Conejo', 'Ave', 'Reptil', 'Otro'])}
          {F('Raza *', 'breed')}
          {F('Sexo *', 'sex', 'text', ['Macho', 'Hembra'])}
          {F('Fecha de nacimiento *', 'fecha_nacimiento', 'date')}
          {F('Peso (kg) *', 'weight', 'number')}
          {F('Esterilizado *', 'esterilizado', 'text', ['No', 'Sí'])}
          {F('Carácter *', 'caracter', 'text', ['Dócil', 'Calmado', 'Nervioso', 'Agresivo'])}
        </div>
      </Modal>
    </div>
  );
}
