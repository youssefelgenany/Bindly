import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import professorApiService from '../api/professorApi';


const categories = [
  'seminar',
  'workshop',
  'other',
  'sports',
];

const ProfessorEvents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingId, setIsEditingId] = useState(null);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [participantsEventId, setParticipantsEventId] = useState(null);
  const [participantsData, setParticipantsData] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState('');
  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);
  const [announcementFormOpenForId, setAnnouncementFormOpenForId] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState({ eventId: '', title: '', message: '' });
  const [announceError, setAnnounceError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    agenda: '',
    faculty: '',
    professors: '',
    startDate: '',
    endDate: '',
    location: '',
    category: 'workshop',
    bannerFile: null,
  });
  const [formError, setFormError] = useState('');

  // Fetch professor events on component mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError('');
        console.log('🎓 Fetching professor events...');
        const result = await professorApiService.getMyEvents();
        
        if (result.success) {
          console.log('✅ Events fetched successfully:', result.data.events);
          // Transform backend data to match frontend format
          const transformedEvents = result.data.events.map(event => ({
            id: event._id,
            title: event.title,
            description: event.description || '',
            agenda: event.agenda || '',
            faculty: event.faculty || '',
            professors: event.professors || '',
            startDate: event.startDate,
            endDate: event.endDate,
            datetime: event.startDate,
            location: event.location,
            category: event.type || 'other',
            status: event.status,
            participants: event.registeredCount || 0,
            registrations: [], // We'll fetch these separately if needed
            bannerFile: event.bannerFile || null,
            bannerName: event.bannerFile ? event.bannerFile.split('/').pop() : '', // Extract filename
          }));
          setEvents(transformedEvents);
        } else {
          setError(result.message || 'Failed to fetch events');
        }
      } catch (err) {
        console.error('❌ Error fetching events:', err);
        setError('Failed to fetch events. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  }, [events]);

  const resetForm = () => {
    setForm({ title: '', description: '', agenda: '', faculty: '', professors: '', startDate: '', endDate: '', location: '', category: 'workshop', bannerFile: null });
    setFormError('');
    setIsEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (evt) => {
    console.log('🔍 Opening edit for event:', evt);
    setForm({
      title: evt.title || '',
      description: evt.description || '',
      agenda: evt.agenda || '',
      faculty: evt.faculty || '',
      professors: evt.professors || '',
      startDate: evt.startDate ? new Date(evt.startDate).toISOString().slice(0, 16) : '',
      endDate: evt.endDate ? new Date(evt.endDate).toISOString().slice(0, 16) : '',
      location: evt.location || '',
      category: evt.category || 'workshop',
      bannerFile: null, // Reset file input
    });
    setIsEditingId(evt.id);
    setIsModalOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.title.trim() || !form.startDate || !form.endDate || !form.location.trim()) {
      setFormError('Please fill in Workshop Name, Start & End, and Location.');
      return;
    }

    console.log('👤 Current user:', user);
    console.log('🔑 Token:', localStorage.getItem('token') ? 'Present' : 'Missing');

    try {
      const eventData = {
        title: form.title,
        description: form.description,
        agenda: form.agenda,
        faculty: form.faculty,
        professors: form.professors,
        type: 'workshop',
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        location: form.location,
        capacity: 100,
        status: 'pending'
      };

      if (isEditingId) {
        // Update existing event
        const result = await professorApiService.updateEvent(isEditingId, eventData);
        if (result.success) {
          // Refresh events list
          const fetchResult = await professorApiService.getMyEvents();
          if (fetchResult.success) {
            const transformedEvents = fetchResult.data.events.map(event => ({
              id: event._id,
              title: event.title,
              description: event.description || '',
              agenda: event.agenda || '',
              faculty: event.faculty || '',
              professors: event.professors || '',
              startDate: event.startDate,
              endDate: event.endDate,
              datetime: event.startDate,
              location: event.location,
              category: event.type || 'other',
              status: event.status,
              participants: event.registeredCount || 0,
              registrations: [],
              bannerFile: event.bannerFile || null,
              bannerName: event.bannerFile ? event.bannerFile.split('/').pop() : '',
            }));
            setEvents(transformedEvents);
          }
        } else {
          setFormError(result.message || 'Failed to update event');
          return;
        }
      } else {
        // Create new event
        console.log('🎯 Creating new event with data:', eventData);
        const result = await professorApiService.createEvent(eventData);
        console.log('📊 Create event result:', result);
        if (result.success) {
          // Refresh events list
          const fetchResult = await professorApiService.getMyEvents();
          if (fetchResult.success) {
            const transformedEvents = fetchResult.data.events.map(event => ({
              id: event._id,
              title: event.title,
              description: event.description || '',
              agenda: event.agenda || '',
              faculty: event.faculty || '',
              professors: event.professors || '',
              startDate: event.startDate,
              endDate: event.endDate,
              datetime: event.startDate,
              location: event.location,
              category: event.type || 'other',
              status: event.status,
              participants: event.registeredCount || 0,
              registrations: [],
              bannerFile: event.bannerFile || null,
              bannerName: event.bannerFile ? event.bannerFile.split('/').pop() : '',
            }));
            setEvents(transformedEvents);
          }
        } else {
          console.error('❌ Event creation failed:', result);
          setFormError(result.message || 'Failed to create event');
          return;
        }
    }

    setIsModalOpen(false);
    resetForm();
    } catch (err) {
      console.error('❌ Error submitting event:', err);
      setFormError('Failed to submit event. Please try again.');
    }
  };

  const onDelete = async (id) => {
    try {
      const result = await professorApiService.deleteEvent(id);
      if (result.success) {
        // Refresh events list
        const fetchResult = await professorApiService.getMyEvents();
        if (fetchResult.success) {
          const transformedEvents = fetchResult.data.events.map(event => ({
            id: event._id,
            title: event.title,
            description: event.description || '',
            agenda: event.agenda || '',
            faculty: event.faculty || '',
            professors: event.professors || '',
            startDate: event.startDate,
            endDate: event.endDate,
            datetime: event.startDate,
            location: event.location,
            category: event.type || 'other',
            status: event.status,
            participants: event.registeredCount || 0,
            registrations: [],
            bannerFile: event.bannerFile || null,
            bannerName: event.bannerFile ? event.bannerFile.split('/').pop() : '',
          }));
          setEvents(transformedEvents);
        }
      } else {
        alert(result.message || 'Failed to delete event');
      }
    } catch (err) {
      console.error('❌ Error deleting event:', err);
      alert('Failed to delete event. Please try again.');
    }
  };

  const canEdit = (status) => status === 'pending' || status === 'rejected';

  const openParticipants = async (eventId) => {
    setParticipantsEventId(eventId);
    setIsParticipantsOpen(true);
    setParticipantsError('');
    
    try {
      setParticipantsLoading(true);
      const result = await professorApiService.getEventRegistrations(eventId);
      if (result.success) {
        setParticipantsData(result.data.registrations || []);
      } else {
        setParticipantsError(result.message || 'Failed to load participants');
      }
    } catch (err) {
      console.error('❌ Error loading participants:', err);
      setParticipantsError('Failed to load participants');
    } finally {
      setParticipantsLoading(false);
    }
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

  const openAnnouncements = async () => {
    setIsAnnouncementsOpen(true);
    await fetchAnnouncements();
  };
  
  const closeAnnouncements = () => setIsAnnouncementsOpen(false);

  const fetchAnnouncements = async () => {
    try {
      setAnnouncementsLoading(true);
      setAnnouncementsError('');
      console.log('📢 Fetching announcements...');
      const result = await professorApiService.getMyAnnouncements();
      
      if (result.success) {
        console.log('✅ Announcements fetched successfully:', result.data.announcements);
        setAnnouncements(result.data.announcements);
      } else {
        setAnnouncementsError(result.message || 'Failed to fetch announcements');
      }
    } catch (err) {
      console.error('❌ Error fetching announcements:', err);
      setAnnouncementsError('Failed to fetch announcements. Please try again.');
    } finally {
      setAnnouncementsLoading(false);
    }
  };

  const openAnnouncementForm = (eventId) => {
    setAnnouncementFormOpenForId(eventId);
    setNewAnnouncement({ eventId, title: '', message: '' });
    setAnnounceError('');
  };

  const submitAnnouncement = async (e) => {
    e.preventDefault();
    setAnnounceError('');
    const { eventId, title, message } = newAnnouncement;
    if (!eventId || !title.trim() || !message.trim()) {
      setAnnounceError('Please fill Event, Title, and Message.');
      return;
    }

    try {
      console.log('📢 Creating announcement:', newAnnouncement);
      const result = await professorApiService.createAnnouncement(newAnnouncement);
      
      if (result.success) {
        console.log('✅ Announcement created successfully');
        // Refresh announcements list
        await fetchAnnouncements();
    setAnnouncementFormOpenForId(null);
        setNewAnnouncement({ eventId: '', title: '', message: '' });
      } else {
        setAnnounceError(result.message || 'Failed to create announcement');
      }
    } catch (err) {
      console.error('❌ Error creating announcement:', err);
      setAnnounceError('Failed to create announcement. Please try again.');
    }
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
            <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>My Workshops & Events</h1>
            <p className="card-subtitle">View all workshops and events you've created. Create new workshops and manage existing ones.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ color: 'var(--text-light)' }}>Logged in as: {user?.firstName} {user?.lastName}</div>
            <button className="btn btn-primary" onClick={openCreate}>+ Create Workshop</button>
          </div>

          {/* Workshop Summary */}
          {!loading && events.length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem', 
              marginBottom: '1rem' 
            }}>
              <div style={{ 
                backgroundColor: 'var(--light-gray)', 
                padding: '1rem', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--guc-red)' }}>
                  {events.length}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Total Workshops</div>
              </div>
              <div style={{ 
                backgroundColor: 'var(--light-gray)', 
                padding: '1rem', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success-green)' }}>
                  {events.filter(e => e.status === 'approved').length}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Approved</div>
              </div>
              <div style={{ 
                backgroundColor: 'var(--light-gray)', 
                padding: '1rem', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning-yellow)' }}>
                  {events.filter(e => e.status === 'pending').length}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Pending</div>
              </div>
              <div style={{ 
                backgroundColor: 'var(--light-gray)', 
                padding: '1rem', 
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--error-red)' }}>
                  {events.filter(e => e.status === 'rejected').length}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>Rejected</div>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
              Loading your events...
            </div>
          ) : (
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
                            <button className="btn btn-outline" disabled={!canEdit(ev.status)} onClick={() => openEdit(ev)}>
                              Edit
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
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn btn-outline" onClick={openAnnouncements}>View Announcements</button>
          </div>

          {/* Modal */}
          {isModalOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '1rem', overflowY: 'auto' }}>
              <div className="card" style={{ maxWidth: 640, width: '100%', maxHeight: '90vh', marginTop: '2rem', marginBottom: '2rem' }}>
                <h3 style={{ color: 'var(--charcoal-black)', marginBottom: '1rem' }}>
                  {isEditingId ? 'Edit Workshop' : 'Create Workshop'}
                </h3>
                {formError && (
                  <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{formError}</div>
                )}
                <form onSubmit={onSubmit} style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 120px)' }}>
                  <div className="form-group">
                    <label className="form-label">Workshop Name</label>
                    <input className="form-input" type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Enter workshop name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <select className="form-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}>
                      <option value="">Select location</option>
                      <option value="GUC Cairo">GUC Cairo</option>
                      <option value="GUC Berlin">GUC Berlin</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Start Date & Time</label>
                      <input className="form-input" type="datetime-local" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">End Date & Time</label>
                      <input className="form-input" type="datetime-local" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Short Description</label>
                    <textarea className="form-input" rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief overview" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Full Agenda</label>
                    <textarea className="form-input" rows="5" value={form.agenda} onChange={e => setForm({ ...form, agenda: e.target.value })} placeholder="Detailed agenda" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Faculty Responsible</label>
                    <input className="form-input" type="text" value={form.faculty} onChange={e => setForm({ ...form, faculty: e.target.value })} placeholder="e.g., MET, IET" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Professor(s)</label>
                    <input className="form-input" type="text" value={form.professors} onChange={e => setForm({ ...form, professors: e.target.value })} placeholder="Comma-separated names" />
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
                      {isEditingId ? 'Save Changes' : 'Create Workshop'}
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
                          <button className="btn btn-secondary" onClick={() => { 
                            setIsParticipantsOpen(false); 
                            setParticipantsEventId(null); 
                            setParticipantsData([]);
                            setParticipantsError('');
                          }}>Close</button>
                        </div>
                      </div>
                      
                      {participantsError && (
                        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                          {participantsError}
                        </div>
                      )}
                      
                      {participantsLoading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                          Loading participants...
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>Name</th>
                                <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>Email</th>
                                <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>Student ID</th>
                                <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>User Type</th>
                                <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>Status</th>
                                <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>Registered At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {participantsData.length === 0 ? (
                                <tr>
                                  <td colSpan="6" style={{ padding: '1rem', color: 'var(--text-light)', textAlign: 'center' }}>No registrations yet.</td>
                                </tr>
                              ) : (
                                participantsData.map(r => (
                                  <tr key={r.id}>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>{r.name}</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>{r.email}</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>{r.studentId || 'N/A'}</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>{r.userType}</td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>
                                      <span style={{
                                        color: r.status === 'approved' ? 'var(--success-green)' : r.status === 'rejected' ? 'var(--error-red)' : 'var(--warning-yellow)'
                                      }}>
                                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                                      </span>
                                    </td>
                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--medium-gray)' }}>
                                      {new Date(r.registeredAt).toLocaleString()}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Global Announcements Modal */}
          {isAnnouncementsOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '1rem', overflowY: 'auto' }}>
              <div className="card" style={{ maxWidth: 900, width: '100%', maxHeight: '90vh', marginTop: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ color: 'var(--charcoal-black)', margin: 0 }}>Announcements</h3>
                  <button className="btn btn-secondary" onClick={closeAnnouncements}>Close</button>
                </div>
                
                {announcementsError && (
                  <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                    {announcementsError}
                  </div>
                )}

                {announcementsLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>
                    Loading announcements...
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '0.75rem', overflowY: 'auto', maxHeight: 'calc(90vh - 120px)' }}>
                  {announcements.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '1rem' }}>No announcements yet.</div>
                  ) : (
                    announcements.map(a => (
                        <div key={a._id} style={{ backgroundColor: 'var(--white)', border: '1px solid var(--medium-gray)', borderRadius: 8, padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <div style={{ fontWeight: 600, color: 'var(--charcoal-black)' }}>{a.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{new Date(a.createdAt).toLocaleString()}</div>
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text-light)', marginTop: 6 }}>{a.message}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 6 }}>
                            Source: {a.source} | Event: {a.eventId?.title || 'Unknown Event'}
                          </div>
                      </div>
                    ))
                  )}
                </div>
                )}
              </div>
            </div>
          )}

          {/* New Announcement Form (per-event) */}
          {announcementFormOpenForId && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '1rem', overflowY: 'auto' }}>
              <div className="card" style={{ maxWidth: 640, width: '100%', maxHeight: '90vh', marginTop: '2rem', marginBottom: '2rem' }}>
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



