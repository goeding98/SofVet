import { useState } from 'react';
import { useStore } from '../utils/useStore';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';

const EMPTY = { patient_name: '', owner: '', insurance_company: '', policy_number: '', coverage: '', deductible: '', validity_from: '', validity_to: '', status: 'activo', notes: '' };

const badge = (s) => {
  const map = { activo: ['#e8f5ee', '#2e7d50'], 'por vencer': ['#fff8e1', '#b8860b'], vencido: ['#fdecea', '#c0392b'] };
  const [bg, color] = map[s] || ['#eee', '#555'];
  return <span style={{ background: bg, color, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 500 }}>{s}</span>;
};

export default function EPSPage() {
  const { items, add, edit, remove } = useStore('eps');
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const openAdd  = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit = (row) => { setForm({ ...row }); setEditId(row.id); setModal(true); };

  const handleSave = () => {
    if (!form.patient_name.trim() || !form.insurance_company.trim()) return alert('Paciente y aseguradora son requeridos');
    editId ? edit(editId, form) : add(form);
    setModal(false);
  };

  const handleDelete = (row) => { if (confirm(`¿Eliminar seguro de ${row.patient_name}?`)) remove(row.id); };

  const columns = [
    { key: 'patient_name',      label: 'Paciente',    render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600 }}>🛡 {v}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{row.owner}</div>
      </div>
    )},
    { key: 'insurance_company', label: 'Aseguradora' },
    { key: 'policy_number',     label: 'No. Póliza',  render: v => <code style={{ background: 'var(--color-bg)', padding: '2px 6px', borderRadius: 4, fontSize: '0.78rem' }}>{v}</code> },
    { key: 'coverage',          label: 'Cobertura',   render: v => <span style={{ maxWidth: 160, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v || '—'}</span> },
    { key: 'deductible',        label: 'Deducible',   render: v => v ? `$${Number(v).toLocaleString('es-CO')}` : '—' },
    { key: 'validity_to',       label: 'Vence',       render: v => v || '—' },
    { key: 'status',            label: 'Estado',      render: v => badge(v) },
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
        <h1>EPS / Seguros</h1>
        <p>{items.filter(d => d.status === 'activo').length} pólizas activas · {items.filter(d => d.status === 'por vencer').length} por vencer</p>
      </div>

      <Card
        title="Seguros / EPS Registrados"
        action={<Button onClick={openAdd} icon="+" variant="primary" size="sm">Nueva Póliza</Button>}
      >
        <Table columns={columns} data={items} onEdit={openEdit} onDelete={handleDelete} emptyMessage="Sin seguros registrados. ¡Agrega el primero!" />
      </Card>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editId ? 'Editar Póliza' : 'Nueva Póliza / EPS'} onSave={handleSave} size="lg">
        <div className="grid-2">
          {F('Paciente', 'patient_name')}
          {F('Propietario', 'owner')}
          {F('Aseguradora', 'insurance_company', 'text', ['PetSalud EPS', 'MascotaSegura', 'VetProtect', 'PetCare Plus', 'Otra'])}
          {F('Número de póliza', 'policy_number')}
          {F('Deducible ($)', 'deductible', 'number')}
          {F('Estado', 'status', 'text', ['activo', 'por vencer', 'vencido'])}
          {F('Vigencia desde', 'validity_from', 'date')}
          {F('Vigencia hasta', 'validity_to', 'date')}
        </div>
        {F('Cobertura', 'coverage')}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Notas</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ width: '100%', padding: '0.6rem 0.75rem', resize: 'vertical' }} />
        </div>
      </Modal>
    </div>
  );
}
