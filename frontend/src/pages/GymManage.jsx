import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import gymApi from '../api/gymApi'; // axios instance

const TYPES = ['Yoga', 'Pilates', 'Aerobics', 'Zumba', 'Cross Circuit', 'Kick-boxing', 'Crossfit', 'Strength', 'Cardio'];

const GymManage = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    date: '',
    time: '',
    durationMinutes: 60,
    type: TYPES[0],
    instructor: '',
    maxParticipants: 30,
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMessage('');
  }, [form]);

  const canAccess = (
    user?.userType === 'EventOffice' ||
    user?.userType === 'Events Office' ||
    user?.userType === 'event_office' ||
    user?.role === 'event_office' ||
    user?.role === 'admin' ||
    user?.userType === 'Admin'
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!form.date || !form.time || !form.type) {
      setMessage('Please fill date, time, and type.');
      return;
    }
    if (!form.maxParticipants || Number(form.maxParticipants) <= 0) {
      setMessage('Max participants must be a positive number.');
      return;
    }

    const start = new Date(`${form.date}T${form.time}:00`);
    const payload = {
      title: `${form.type} Session`,
      type: form.type.toLowerCase(),
      durationMinutes: Number(form.durationMinutes) || 60,
      // keep date/time in case backend expects them
      date: form.date,
      time: form.time,
      startTime: start.toISOString(),
      instructor: form.instructor || undefined,
      maxParticipants: Number(form.maxParticipants),
      capacity: Number(form.maxParticipants),
    };

    setSubmitting(true);

    try {
      console.log('Creating gym session payload:', payload);

      // try POST to /sessions first (preferred). If your backend uses root '/', change to '/'
      const response = await gymApi.post('/sessions', payload);

      console.log('Create session response:', response);
      // success status may be 201 or 200 depending on backend
      if (response.status >= 200 && response.status < 300) {
        setMessage('Session created successfully.');
        setForm({ date: '', time: '', durationMinutes: 60, type: TYPES[0], instructor: '', maxParticipants: 30 });
      } else {
        setMessage(response.data?.msg || 'Failed to create session');
      }
    } catch (err) {
      console.error('create session error', err);
      // prefer backend message if available
      const serverMsg = err.response?.data?.msg || err.response?.data?.message || err.message;
      setMessage(serverMsg || 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canAccess) {
    return (
      <div style={{ padding: '2rem' }}>
        <div className="container">
          <div className="card">
            <div className="card-header">
              <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Unauthorized</h1>
              <p className="card-subtitle">Only the Events Office can create gym sessions.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div className="container">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Create Gym Session</h1>
            <p className="card-subtitle">Provide date, time, duration, type, and optional instructor.</p>
          </div>

          {message && (
            <div className={message.includes('successfully') ? 'alert alert-success' : 'alert alert-error'} style={{ marginBottom: '1rem' }}>
              {message}
            </div>
          )}

          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <input className="form-input" type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Duration (minutes)</label>
              <input className="form-input" type="number" min="10" step="5" value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Max number of participants</label>
              <input className="form-input" type="number" min="1" step="1" value={form.maxParticipants} onChange={e => setForm({ ...form, maxParticipants: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Instructor (optional)</label>
              <input className="form-input" type="text" value={form.instructor} onChange={e => setForm({ ...form, instructor: e.target.value })} placeholder="e.g., Coach Ahmed" />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Session'}</button>
              <button className="btn btn-secondary" type="button" onClick={() => setForm({ date: '', time: '', durationMinutes: 60, type: TYPES[0], instructor: '', maxParticipants: 30 })}>Reset</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GymManage;


