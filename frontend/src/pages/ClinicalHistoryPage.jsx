import { useState } from 'react';
import { useStore } from '../utils/useStore';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';

const EMPTY = { patient_name: '', date: '', vet: 'Dr. Andrés Mora', reason: '', diagnosis: '', treatment: '', observations: '', weight: '', temperature: '' };

export default function ClinicalHistoryPage() {
  const { items: history, add, edit, remove } = useStore('clinicalHistory');
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = history.filter(h => h.patient_name.toLowerCase().includes(search.toLowerCase()));

  const openAdd  = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit = (row) => { setForm({ ...row }); setEditId(row.id); setModal(true); };

  const handleSave = () => {
    if (!form.patient_name.trim() || !form.diagnosis.trim()) return alert('Paciente y diagnóstico son requeridos');
    editId ? edit(editId, form) : add(form);
    setModal(false);
  };

  const handleDelete = (row) => {
    if (confirm(`¿Eliminar registro de ${row.patient_name}?`)) remove(row.id);
  };

  const columns = [
    { key: 'date',         label: 'Fecha',      render: v => <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{v}</span> },
    { key: 'patient_name', label: 'Paciente',   render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
    { key: 'reason',       label: 'Motivo' },
    { key: 'diagnosis',    label: 'Diagnóstico', render: v => <span style={{ maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span> },
    { key: 'weight',       label: 'Peso',        render: v => v ? `${v} kg` : '—' },
    { key: 'temperature',  label: 'Temp.',       render: v => v ? `${v}°C` : '—' },
    { key: 'vet',          label: 'Veterinario' },
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
        <h1>Historia Clínica</h1>
        <p>{history.length} registros en el historial</p>
      </div>

      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <input placeholder="Buscar por nombre de paciente..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, padding: '0.6rem 1rem' }} />
          <Button onClick={openAdd} icon="+" variant="primary">Nuevo Registro</Button>
        </div>
      </Card>

      <Card>
        <Table columns={columns} data={filtered} onEdit={openEdit} onDelete={handleDelete} emptyMessage="Sin registros clínicos. ¡Agrega el primero!" />
      </Card>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editId ? 'Editar Historial' : 'Nuevo Registro Clínico'} onSave={handleSave} size="lg">
        <div className="grid-2">
          {F('Paciente', 'patient_name')}
          {F('Fecha', 'date', 'date')}
          {F('Veterinario', 'vet', 'text', ['Dr. Andrés Mora', 'Dra. Sofía Rivas', 'Dr. Juan Castro'])}
          {F('Motivo de consulta', 'reason')}
          {F('Peso (kg)', 'weight', 'number')}
          {F('Temperatura (°C)', 'temperature', 'number')}
        </div>
        {TA('Diagnóstico *', 'diagnosis')}
        {TA('Tratamiento', 'treatment')}
        {TA('Observaciones', 'observations')}
      </Modal>
    </div>
  );
}
