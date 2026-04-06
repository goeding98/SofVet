import { useState } from 'react';
import { useStore } from '../utils/useStore';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';

const EMPTY = { patient_name: '', owner: '', date: '', referred_to: '', specialty: '', reason: '', referring_vet: 'Dr. Andrés Mora', status: 'enviada', notes: '' };

const badge = (s) => {
  const map = { enviada: ['#fdecea', '#c0392b'], completada: ['#e8f5ee', '#2e7d50'], pendiente: ['#fff8e1', '#b8860b'] };
  const [bg, color] = map[s] || ['#eee', '#555'];
  return <span style={{ background: bg, color, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 500 }}>{s}</span>;
};

export default function RemissionsPage() {
  const { items, add, edit, remove } = useStore('remissions');
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const openAdd  = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit = (row) => { setForm({ ...row }); setEditId(row.id); setModal(true); };

  const handleSave = () => {
    if (!form.patient_name.trim() || !form.referred_to.trim()) return alert('Paciente y destino son requeridos');
    editId ? edit(editId, form) : add(form);
    setModal(false);
  };

  const handleDelete = (row) => { if (confirm(`¿Eliminar remisión de ${row.patient_name}?`)) remove(row.id); };

  const columns = [
    { key: 'date',          label: 'Fecha',      render: v => <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{v}</span> },
    { key: 'patient_name',  label: 'Paciente',   render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600 }}>{v}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{row.owner}</div>
      </div>
    )},
    { key: 'referred_to',   label: 'Remitido a', render: v => <span style={{ maxWidth: 160, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span> },
    { key: 'specialty',     label: 'Especialidad', render: v => v || '—' },
    { key: 'referring_vet', label: 'Remite'     },
    { key: 'status',        label: 'Estado',     render: v => badge(v) },
  ];

  const F = (label, key, type = 'text', opts) => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text)' }}>{label}</label>
      {opts
        ? <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '0.6rem 0.75rem' }}>
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        : <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '0.6rem 0.75rem' }} />
      }
    </div>
  );

  const TA = (label, key) => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      <textarea value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={2} style={{ width: '100%', padding: '0.6rem 0.75rem', resize: 'vertical' }} />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Remisiones</h1>
        <p>{items.length} remisiones · {items.filter(d => d.status === 'enviada').length} pendientes de respuesta</p>
      </div>

      <Card
        title="Remisiones a Especialistas"
        action={<Button onClick={openAdd} icon="+" variant="primary" size="sm">Nueva Remisión</Button>}
      >
        <Table columns={columns} data={items} onEdit={openEdit} onDelete={handleDelete} emptyMessage="Sin remisiones registradas." />
      </Card>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editId ? 'Editar Remisión' : 'Nueva Remisión'} onSave={handleSave} size="lg">
        <div className="grid-2">
          {F('Paciente', 'patient_name')}
          {F('Propietario', 'owner')}
          {F('Fecha', 'date', 'date')}
          {F('Especialidad', 'specialty', 'text', ['Neurología', 'Dermatología', 'Traumatología', 'Cardiología', 'Oncología', 'Oftalmología', 'Otra'])}
          {F('Remitido a', 'referred_to')}
          {F('Veterinario que remite', 'referring_vet', 'text', ['Dr. Andrés Mora', 'Dra. Sofía Rivas', 'Dr. Juan Castro'])}
          {F('Estado', 'status', 'text', ['pendiente', 'enviada', 'completada'])}
        </div>
        {TA('Motivo de remisión *', 'reason')}
        {TA('Notas adicionales', 'notes')}
      </Modal>
    </div>
  );
}
