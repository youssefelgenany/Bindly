import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const initialMockEvents = [
  {
    id: 'evt-1',
    title: 'Machine Learning Workshop',
    description: 'Hands-on intro to ML with Python.',
    datetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Room B-302',
    category: 'Academic Talk',
    status: 'approved',
    participants: 42,
    bannerName: '',
  },
  {
    id: 'evt-2',
    title: 'AI Ethics Discussion',
    description: 'Panel on ethical AI practices.',
    datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Auditorium A',
    category: 'Seminar',
    status: 'pending',
    participants: 15,
    bannerName: 'ethics-flyer.pdf',
  },
  {
    id: 'evt-3',
    title: 'Club Open Day',
    description: 'Showcase of student clubs.',
    datetime: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Main Hall',
    category: 'Club Event',
    status: 'rejected',
    participants: 0,
    bannerName: '',
  },
];

const categories = [
  'Academic Talk',
  'Club Event',
  'Seminar',
  'Workshop',
];

const ProfessorEvents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState(initialMockEvents);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingId, setIsEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    datetime: '',
    location: '',
    category: categories[0],
    bannerFile: null,
  });
  const [formError, setFormError] = useState('');

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  }, [events]);

  const resetForm = () => {
    setForm({ title: '', description: '', datetime: '', location: '', category: categories[0], bannerFile: null });
    setFormError('');
    setIsEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (evt) => {
    setForm({
      title: evt.title,
      description: evt.description,
      datetime: evt.datetime.slice(0, 16),
      location: evt.location,
      category: evt.category,
      bannerFile: null,
    });
    setIsEditingId(evt.id);
    setIsModalOpen(true);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.title.trim() || !form.datetime || !form.location.trim() || !form.category) {
      setFormError('Please fill in Title, Date & Time, Location, and Category.');
      return;
    }

    const bannerName = form.bannerFile ? form.bannerFile.name : '';

    if (isEditingId) {
      setEvents(prev => prev.map(ev => ev.id === isEditingId ? {
        ...ev,
        title: form.title,
        description: form.description,
        datetime: new Date(form.datetime).toISOString(),
        location: form.location,
        category: form.category,
        bannerName: bannerName || ev.bannerName,
      } : ev));
    } else {
      const newEvent = {
        id: `evt-${Math.random().toString(36).slice(2, 8)}`,
        title: form.title,
        description: form.description,
        datetime: new Date(form.datetime).toISOString(),
        location: form.location,
        category: form.category,
        status: 'pending', // submit for approval
        participants: 0,
        bannerName,
      };
      setEvents(prev => [newEvent, ...prev]);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const onDelete = (id) => {
    setEvents(prev => prev.filter(ev => ev.id !== id));
  };

  const canEdit = (status) => status === 'pending';

  return (
    <div style={{ padding: '2rem' }}>
      <div className="container">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>My Events</h1>
            <p className="card-subtitle">Create and manage your events. Submit new events for approval.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ color: 'var(--text-light)' }}>Logged in as: {user?.firstName} {user?.lastName}</div>
            <button className="btn btn-primary" onClick={openCreate}>+ Create Event</button>
          </div>

          <div className="card" style={{ backgroundColor: 'var(--light-gray)', marginBottom: '1rem' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>Event</th>
                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>Date & Time</th>
                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>Status</th>
                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>Category</th>
                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>Participants</th>
                    <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEvents.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: '1rem', color: 'var(--text-light)', textAlign: 'center' }}>No events yet. Click "Create Event" to add one.</td>
                    </tr>
                  ) : (
                    sortedEvents.map(ev => (
                      <tr key={ev.id}>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>
                          <div style={{ fontWeight: 600, color: 'var(--charcoal-black)' }}>{ev.title}</div>
                          <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>{ev.location}</div>
                        </td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>
                          {new Date(ev.datetime).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>
                          <span style={{
                            color: ev.status === 'approved' ? 'var(--success-green)' : ev.status === 'rejected' ? 'var(--error-red)' : 'var(--warning-yellow)'
                          }}>
                            {ev.status.charAt(0).toUpperCase() + ev.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>{ev.category}</td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>{ev.participants}</td>
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-outline" disabled={!canEdit(ev.status)} onClick={() => openEdit(ev)}>
                              Edit
                            </button>
                            <button className="btn btn-secondary" onClick={() => onDelete(ev.id)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal */}
          {isModalOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
              <div className="card" style={{ maxWidth: 640, width: '100%' }}>
                <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>
                  {isEditingId ? 'Edit Event' : 'Create Event'}
                </h3>
                {formError && (
                  <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{formError}</div>
                )}
                <form onSubmit={onSubmit}>
                  <div className="form-group">
                    <label className="form-label">Event Title</label>
                    <input className="form-input" type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Enter event title" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-input" rows="4" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the event (optional)" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date & Time</label>
                    <input className="form-input" type="datetime-local" value={form.datetime} onChange={e => setForm({ ...form, datetime: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input className="form-input" type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g., Room C-210" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Banner/Flyer (optional)</label>
                    <input className="form-input" type="file" onChange={e => setForm({ ...form, bannerFile: e.target.files?.[0] || null })} />
                    {form.bannerFile && (
                      <div style={{ fontSize: 14, color: 'var(--text-light)', marginTop: '0.25rem' }}>Selected: {form.bannerFile.name}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-primary">
                      {isEditingId ? 'Save Changes' : 'Submit for Approval'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); resetForm(); }}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessorEvents;


