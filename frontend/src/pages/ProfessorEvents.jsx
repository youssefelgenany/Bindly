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
    registrations: [
      { id: 'r-1', name: 'Sara Kamal', email: 'sara.kamal@guc.edu', studentId: '19-1234', status: 'approved' },
      { id: 'r-2', name: 'Ahmed Hassan', email: 'ahmed.hassan@guc.edu', studentId: '20-5678', status: 'approved' },
      { id: 'r-3', name: 'Omar Ali', email: 'omar.ali@guc.edu', studentId: '21-4321', status: 'pending' },
    ],
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
    registrations: [
      { id: 'r-4', name: 'Mona Adel', email: 'mona.adel@guc.edu', studentId: '19-7890', status: 'pending' },
      { id: 'r-5', name: 'Youssef Zaki', email: 'youssef.zaki@guc.edu', studentId: '20-2468', status: 'pending' },
      { id: 'r-6', name: 'Laila Nabil', email: 'laila.nabil@guc.edu', studentId: '18-1357', status: 'rejected' },
    ],
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
    registrations: [],
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
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [participantsEventId, setParticipantsEventId] = useState(null);
  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);
  const [announcementFormOpenForId, setAnnouncementFormOpenForId] = useState(null);
  const [announcements, setAnnouncements] = useState([
    { id: 'a-1', eventId: 'evt-1', title: 'Room Change', message: 'Workshop moved to Room B-302.', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), source: 'Event Office' },
    { id: 'a-2', eventId: 'evt-2', title: 'Guidelines Update', message: 'Please read the updated participation guidelines.', createdAt: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(), source: 'Admin' },
  ]);
  const [newAnnouncement, setNewAnnouncement] = useState({ eventId: '', title: '', message: '' });
  const [announceError, setAnnounceError] = useState('');
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

  const openParticipants = (eventId) => {
    setParticipantsEventId(eventId);
    setIsParticipantsOpen(true);
  };

  const updateRegistrationStatus = (eventId, regId, status) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id !== eventId) return ev;
      const updatedRegs = (ev.registrations || []).map(r => r.id === regId ? { ...r, status } : r);
      const approvedCount = updatedRegs.filter(r => r.status === 'approved').length;
      return { ...ev, registrations: updatedRegs, participants: approvedCount };
    }));
  };

  const downloadCSV = (eventId) => {
    const ev = events.find(e => e.id === eventId);
    const rows = [['Name', 'Email', 'Student ID', 'Status']].concat((ev.registrations || []).map(r => [r.name, r.email, r.studentId, r.status]));
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ev.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_attendance.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPDF = (eventId) => {
    const ev = events.find(e => e.id === eventId);
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = (ev.registrations || []).map(r => `<tr><td>${r.name}</td><td>${r.email}</td><td>${r.studentId}</td><td>${r.status}</td></tr>`).join('');
    w.document.write(`
      <html>
        <head>
          <title>${ev.title} - Attendance</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h2 { margin: 0 0 16px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 14px; }
            th { background: #f2f2f2; }
          </style>
        </head>
        <body>
          <h2>${ev.title} - Attendance List</h2>
          <div>Date: ${new Date(ev.datetime).toLocaleString()}</div>
          <div>Location: ${ev.location}</div>
          <br />
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Student ID</th><th>Status</th></tr></thead>
            <tbody>${rows || ''}</tbody>
          </table>
          <script>window.onload = function(){ window.print(); }<\/script>
        </body>
      </html>
    `);
    w.document.close();
  };

  const openAnnouncements = () => setIsAnnouncementsOpen(true);
  const closeAnnouncements = () => setIsAnnouncementsOpen(false);

  const openAnnouncementForm = (eventId) => {
    setAnnouncementFormOpenForId(eventId);
    setNewAnnouncement({ eventId, title: '', message: '' });
    setAnnounceError('');
  };

  const submitAnnouncement = (e) => {
    e.preventDefault();
    setAnnounceError('');
    const { eventId, title, message } = newAnnouncement;
    if (!eventId || !title.trim() || !message.trim()) {
      setAnnounceError('Please fill Event, Title, and Message.');
      return;
    }
    const created = { id: `a-${Math.random().toString(36).slice(2, 8)}`, eventId, title, message, createdAt: new Date().toISOString(), source: 'Professor' };
    setAnnouncements(prev => [created, ...prev]);
    setAnnouncementFormOpenForId(null);
  };

  const notifyParticipants = (eventId) => {
    // Placeholder for backend email notification trigger
    alert('Participants notified for event: ' + (events.find(e => e.id === eventId)?.title || '')); // eslint-disable-line no-alert
  };

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
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-outline" onClick={() => openParticipants(ev.id)}>
                              Participants
                            </button>
                            <button className="btn btn-outline" onClick={() => openAnnouncementForm(ev.id)}>
                              + Announcement
                            </button>
                            <button className="btn btn-outline" onClick={() => notifyParticipants(ev.id)}>
                              Notify Participants
                            </button>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn btn-outline" onClick={openAnnouncements}>View Announcements</button>
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

          {/* Participants Modal */}
          {isParticipantsOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
              <div className="card" style={{ maxWidth: 900, width: '100%' }}>
                {(() => {
                  const ev = events.find(e => e.id === participantsEventId);
                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ color: 'var(--charcoal-black)', margin: 0 }}>Participants - {ev?.title}</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-outline" onClick={() => downloadCSV(participantsEventId)}>Download CSV</button>
                          <button className="btn btn-outline" onClick={() => downloadPDF(participantsEventId)}>Download PDF</button>
                          <button className="btn btn-secondary" onClick={() => { setIsParticipantsOpen(false); setParticipantsEventId(null); }}>Close</button>
                        </div>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ textAlign: 'left' }}>
                              <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>Name</th>
                              <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>Email</th>
                              <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>Student ID</th>
                              <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>Status</th>
                              <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(ev?.registrations || []).length === 0 ? (
                              <tr>
                                <td colSpan="5" style={{ padding: '1rem', color: 'var(--text-light)', textAlign: 'center' }}>No registrations yet.</td>
                              </tr>
                            ) : (
                              ev?.registrations?.map(r => (
                                <tr key={r.id}>
                                  <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>{r.name}</td>
                                  <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>{r.email}</td>
                                  <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>{r.studentId}</td>
                                  <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>
                                    <span style={{
                                      color: r.status === 'approved' ? 'var(--success-green)' : r.status === 'rejected' ? 'var(--error-red)' : 'var(--warning-yellow)'
                                    }}>
                                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                      <button className="btn btn-primary" disabled={r.status === 'approved'} onClick={() => updateRegistrationStatus(ev.id, r.id, 'approved')}>Approve</button>
                                      <button className="btn btn-secondary" disabled={r.status === 'rejected'} onClick={() => updateRegistrationStatus(ev.id, r.id, 'rejected')}>Reject</button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Global Announcements Modal */}
          {isAnnouncementsOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
              <div className="card" style={{ maxWidth: 900, width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ color: 'var(--charcoal-black)', margin: 0 }}>Announcements</h3>
                  <button className="btn btn-secondary" onClick={closeAnnouncements}>Close</button>
                </div>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {announcements.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '1rem' }}>No announcements yet.</div>
                  ) : (
                    announcements.map(a => (
                      <div key={a.id} style={{ backgroundColor: 'var(--white)', border: '1px solid var(--medium-gray)', borderRadius: 8, padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <div style={{ fontWeight: 600, color: 'var(--charcoal-black)' }}>{a.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{new Date(a.createdAt).toLocaleString()}</div>
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-light)', marginTop: 6 }}>{a.message}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 6 }}>Source: {a.source}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* New Announcement Form (per-event) */}
          {announcementFormOpenForId && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
              <div className="card" style={{ maxWidth: 640, width: '100%' }}>
                <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>New Announcement</h3>
                {announceError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{announceError}</div>}
                <form onSubmit={submitAnnouncement}>
                  <div className="form-group">
                    <label className="form-label">Event</label>
                    <select className="form-input" value={newAnnouncement.eventId} onChange={e => setNewAnnouncement({ ...newAnnouncement, eventId: e.target.value })}>
                      <option value="">Select an event</option>
                      {events.map(e => (
                        <option key={e.id} value={e.id}>{e.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input className="form-input" type="text" value={newAnnouncement.title} onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} placeholder="Announcement title" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Message</label>
                    <textarea className="form-input" rows="4" value={newAnnouncement.message} onChange={e => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })} placeholder="Write your message..." />
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button type="submit" className="btn btn-primary">Send</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setAnnouncementFormOpenForId(null)}>Cancel</button>
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


