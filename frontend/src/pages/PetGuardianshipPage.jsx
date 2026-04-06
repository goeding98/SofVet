import { useState } from 'react';
import { useStore } from '../utils/useStore';
import Card from '../components/Card';
import Table from '../components/Table';
import Button from '../components/Button';
import Modal from '../components/Modal';

const EMPTY = { patient_name: '', owner: '', check_in: '', check_out: '', room: 'Estándar 1', daily_rate: '', status: 'activo', special_care: '', responsible_vet: 'Dr. Andrés Mora' };

const badge = (s) => {
  const map = { activo: ['#e8f5ee', '#2e7d50'], completado: ['#e3f0f2', '#316d74'], cancelado: ['#fdecea', '#c0392b'] };
  const [bg, color] = map[s] || ['#eee', '#555'];
  return <span style={{ background: bg, color, padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 500 }}>{s}</span>;
};

export default function PetGuardianshipPage() {
  const { items, add, edit, remove } = useStore('guardianship');
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY);
  const [editId, setEditId] = useState(null);

  const openAdd  = () => { setForm(EMPTY); setEditId(null); setModal(true); };
  const openEdit = (row) => { setForm({ ...row }); setEditId(row.id); setModal(true); };

  const handleSave = () => {
    if (!form.patient_name.trim() || !form.check_in) return alert('Paciente y fecha de ingreso son requeridos');
    editId ? edit(editId, form) : add(form);
    setModal(false);
  };

  const handleDelete = (row) => { if (confirm(`¿Eliminar guardería de ${row.patient_name}?`)) remove(row.id); };

  const columns = [
    { key: 'patient_name', label: 'Mascota',      render: v => <span style={{ fontWeight: 600 }}>🏠 {v}</span> },
    { key: 'owner',        label: 'Propietario'  },
    { key: 'check_in',     label: 'Ingreso'      },
    { key: 'check_out',    label: 'Salida',       render: v => v || '—' },
    { key: 'room',         label: 'Habitación'   },
    { key: 'daily_rate',   label: 'Tarifa/día',   render: v => v ? `$${Number(v).toLocaleString('es-CO')}` : '—' },
    { key: 'status',       label: 'Estado',       render: v => badge(v) },
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
        <h1>Guardería</h1>
        <p>{items.filter(d => d.status === 'activo').length} mascotas en guardería actualmente</p>
      </div>

      <Card
        title="Registros de Guardería"
        action={<Button onClick={openAdd} icon="+" variant="primary" size="sm">Nueva Entrada</Button>}
      >
        <Table columns={columns} data={items} onEdit={openEdit} onDelete={handleDelete} emptyMessage="Sin registros de guardería. ¡Agrega el primero!" />
      </Card>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editId ? 'Editar Guardería' : 'Nueva Entrada de Guardería'} onSave={handleSave}>
        <div className="grid-2">
          {F('Mascota', 'patient_name')}
          {F('Propietario', 'owner')}
          {F('Fecha de ingreso', 'check_in', 'date')}
          {F('Fecha de salida', 'check_out', 'date')}
          {F('Habitación', 'room', 'text', ['Suite A', 'Suite B', 'Estándar 1', 'Estándar 2', 'Pequeños 1', 'Pequeños 2'])}
          {F('Tarifa diaria ($)', 'daily_rate', 'number')}
          {F('Veterinario responsable', 'responsible_vet', 'text', ['Dr. Andrés Mora', 'Dra. Sofía Rivas'])}
          {F('Estado', 'status', 'text', ['activo', 'completado', 'cancelado'])}
        </div>
        {F('Cuidados especiales', 'special_care')}
      </Modal>
    </div>
  );
}
