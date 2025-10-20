import React, { useEffect, useState } from 'react';

const WorkshopEditRequestModal = ({ open, onClose, workshop, onSubmitted }) => {
  const [form, setForm] = useState({
    title: '',
    location: '',
    description: '',
    startDate: '',
    endDate: '',
    capacity: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!workshop) return;
    setForm({
      title: workshop.title || workshop.name || '',
      location: workshop.location || '',
      description: workshop.description || '',
      startDate: workshop.startDate ? new Date(workshop.startDate).toISOString().slice(0,16) : '',
      endDate: workshop.endDate ? new Date(workshop.endDate).toISOString().slice(0,16) : '',
      capacity: workshop.capacity ?? workshop.maxParticipants ?? ''
    });
    setMessage('');
  }, [workshop, open]);

  if (!open) return null;

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  // Close immediately on submit, do not send or modify the workshop
  const submitRequest = (e) => {
    e.preventDefault();
    if (typeof onClose === 'function') onClose();
    // do nothing else — workshop remains unchanged and no network request is made
  };

  const professor = workshop?.professorName || workshop?.instructor || '—';

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 760, maxHeight: '85vh', overflow: 'auto', borderRadius: 8 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="card-title" style={{ color: 'var(--guc-red)', margin: 0 }}>Edit Workshop</h2>
            <p className="card-subtitle" style={{ margin: 0, color: 'var(--text-light)' }}>Submit an edit request for review</p>
          </div>
          <div>
            <button className="btn btn-outline" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <form onSubmit={submitRequest} style={{ padding: 20 }}>
          {message && (
            <div className={message.toLowerCase().includes('success') ? 'alert alert-success' : 'alert alert-error'} style={{ marginBottom: 12 }}>
              {message}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Workshop Title</label>
            <input className="form-input" value={form.title} onChange={handleChange('title')} />
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="form-input" value={form.location} onChange={handleChange('location')} />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows="4" value={form.description} onChange={handleChange('description')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Start Date & Time</label>
              <input className="form-input" type="datetime-local" value={form.startDate} onChange={handleChange('startDate')} />
            </div>
            <div className="form-group">
              <label className="form-label">End Date & Time</label>
              <input className="form-input" type="datetime-local" value={form.endDate} onChange={handleChange('endDate')} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Capacity</label>
              <input className="form-input" type="number" min="1" value={form.capacity} onChange={handleChange('capacity')} />
            </div>

            {/* Professor/Instructor is read-only */}
            <div className="form-group">
              <label className="form-label">Professor / Instructor</label>
              <div className="form-input" style={{ background: 'var(--white)', border: '1px solid #e6e6e6', padding: '8px 10px' }}>{professor}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Submitting…' : 'Submit Request'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkshopEditRequestModal;