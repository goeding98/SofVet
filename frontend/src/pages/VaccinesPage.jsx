import { useState } from 'react';
import { useStore } from '../utils/useStore';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';

const EMPTY = { patient_name: '', vaccine_name: '', dose: '1ra dosis', date_applied: '', next_dose: '', vet: 'Dr. Andrés Mora', batch: '', status: 'vigente' };

const badge = (s) => {
  const map = { vigente: ['#e8f5ee', '#2e7d50'], próximo: ['#fff8e1', '#b8860b'], vencido: ['#fdecea', '#c0392b'] };
  const [bg, color] = map[s] || ['#eee', '#555'];
  return <span style={{ background: bg, color, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 500 }}>{s}</span>;
};

export default function VaccinesPage() {
  const { items: vaccines, add, edit, remove } = useStore('vaccines');
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = vaccines.filter(v =>
    v.patient_name.toLowerCase().includes(search.toLowerCase()) ||
    v.vaccine_name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd  = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit = (row) => { setForm({ ...row }); setEditId(row.id); setModal(true); };

  const handleSave = () => {
    if (!form.patient_name.trim() || !form.vaccine_name.trim()) return alert('Paciente y vacuna son requeridos');
    editId ? edit(editId, form) : add(form);
    setModal(false);
  };

  const handleDelete = (row) => {
    if (confirm(`¿Eliminar vacuna ${row.vaccine_name} de ${row.patient_name}?`)) remove(row.id);
  };

  const columns = [
    { key: 'patient_name',  label: 'Paciente', render: v => <span style={{ fontWeight: 600 }}>{v}</span> },
    { key: 'vaccine_name',  label: 'Vacuna'   },
    { key: 'dose',          label: 'Dosis'    },
    { key: 'date_applied',  label: 'Aplicada', render: v => <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{v}</span> },
    { key: 'next_dose',     label: 'Próxima',  render: v => <span style={{ fontWeight: 500, color: 'var(--color-accent)' }}>{v || '—'}</span> },
    { key: 'batch',         label: 'Lote',     render: v => v || '—' },
    { key: 'status',        label: 'Estado',   render: v => badge(v) },
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

  return (
    <div>
      <div className="page-header">
        <h1>Vacunas</h1>
        <p>{vaccines.length} registros · {vaccines.filter(v => v.status === 'próximo').length} próximas a vencer</p>
      </div>

      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <input placeholder="Buscar por paciente o vacuna..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, padding: '0.6rem 1rem' }} />
          <Button onClick={openAdd} icon="+" variant="primary">Registrar Vacuna</Button>
        </div>
      </Card>

      <Card>
        <Table columns={columns} data={filtered} onEdit={openEdit} onDelete={handleDelete} emptyMessage="Sin vacunas registradas. ¡Agrega la primera!" />
      </Card>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editId ? 'Editar Vacuna' : 'Registrar Vacuna'} onSave={handleSave}>
        <div className="grid-2">
          {F('Paciente', 'patient_name')}
          {F('Vacuna', 'vaccine_name', 'text', ['Parvovirus', 'Rabia', 'Moquillo', 'Triple Felina', 'Bordetella', 'Leptospirosis', 'Leucemia Felina', 'Otro'])}
          {F('Dosis', 'dose', 'text', ['1ra dosis', '2da dosis', 'Refuerzo', 'Anual'])}
          {F('Lote', 'batch')}
          {F('Fecha aplicada', 'date_applied', 'date')}
          {F('Próxima dosis', 'next_dose', 'date')}
          {F('Veterinario', 'vet', 'text', ['Dr. Andrés Mora', 'Dra. Sofía Rivas', 'Dr. Juan Castro'])}
          {F('Estado', 'status', 'text', ['vigente', 'próximo', 'vencido'])}
        </div>
      </Modal>
    </div>
  );
}
