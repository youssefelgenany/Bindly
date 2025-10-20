import React, { useState } from 'react';
import '../styles/CreateBazaar.css';

const CreateBooth = () => {
  const [form, setForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
    boothSize: '',
    durationWeeks: '',
    boothLocation: '',
    attendees: [{ name: '', email: '' }],
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const setAttendee = (idx, field, value) => {
    const next = form.attendees.map((a, i) => (i === idx ? { ...a, [field]: value } : a));
    setForm({ ...form, attendees: next });
  };

  const addAttendee = () => {
    if (form.attendees.length >= 5) return;
    setForm({ ...form, attendees: [...form.attendees, { name: '', email: '' }] });
  };

  const removeAttendee = (idx) => {
    const next = form.attendees.filter((_, i) => i !== idx);
    setForm({ ...form, attendees: next.length ? next : [{ name: '', email: '' }] });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!form.title || !form.startDate || !form.endDate || !form.boothSize || !form.durationWeeks || !form.boothLocation) {
      setMessage('Please fill all required fields.');
      return;
    }
    const validAttendees = form.attendees
      .map(a => ({ name: a.name.trim(), email: a.email.trim() }))
      .filter(a => a.name && a.email)
      .slice(0, 5);
    if (validAttendees.length === 0) {
      setMessage('Please add at least one attendee.');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          type: 'booth',
          title: form.title,
          description: form.description,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          capacity: 100,
          // store booth-specific details
          price: undefined,
          extraResources: JSON.stringify({
            boothSize: form.boothSize,
            durationWeeks: form.durationWeeks,
            boothLocation: form.boothLocation,
            attendees: validAttendees,
          })
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data?.message || data?.msg || 'Failed to create booth');
        return;
      }
      setMessage('Booth created successfully! Redirecting...');
      setTimeout(() => {
        setForm({
          title: '', location: '', startDate: '', endDate: '', boothSize: '', durationWeeks: '', boothLocation: '', attendees: [{ name: '', email: '' }], description: ''
        });
        // Redirect to student events view
        window.location.href = '/student/events';
      }, 2000);
    } catch (err) {
      setMessage('Network error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="create-bazaar-page">
      <div className="page-header">
        <h1 className="page-title">Create Booth</h1>
        <p className="page-subtitle">Add details for the booth setup</p>
      </div>

      {message && (
        <div className="alert" style={{ marginBottom: '1rem', color: message.includes('successfully') ? 'var(--success-green)' : 'var(--guc-red)' }}>
          {message}
        </div>
      )}

      <div className="form-container">
        <form className="conference-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Booth Title *</label>
            <input name="title" className="form-input" value={form.title} onChange={handleChange} required />
          </div>


          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date & Time *</label>
              <input type="datetime-local" name="startDate" className="form-input" value={form.startDate} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">End Date & Time *</label>
              <input type="datetime-local" name="endDate" className="form-input" value={form.endDate} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Booth Size *</label>
              <select name="boothSize" className="form-input" value={form.boothSize} onChange={handleChange} required>
                <option value="">Select size</option>
                <option value="2x2">2x2</option>
                <option value="4x4">4x4</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Duration (weeks) *</label>
              <select name="durationWeeks" className="form-input" value={form.durationWeeks} onChange={handleChange} required>
                <option value="">Select duration</option>
                <option value="1">1 week</option>
                <option value="2">2 weeks</option>
                <option value="3">3 weeks</option>
                <option value="4">4 weeks</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Booth Location *</label>
            <input name="boothLocation" className="form-input" value={form.boothLocation} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label">Attendees (max 5) *</label>
            <small style={{ color: 'var(--text-light)' }}>Add full name and email</small>
            {form.attendees.map((a, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input className="form-input" placeholder="Full name" value={a.name} onChange={(e) => setAttendee(idx, 'name', e.target.value)} />
                <input className="form-input" placeholder="Email" value={a.email} onChange={(e) => setAttendee(idx, 'email', e.target.value)} />
                <button type="button" className="btn btn-outline" onClick={() => removeAttendee(idx)}>✕</button>
              </div>
            ))}
            {form.attendees.length < 5 && (
              <button type="button" className="btn btn-secondary" onClick={addAttendee} style={{ marginTop: '0.5rem' }}>Add Attendee</button>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea name="description" className="form-input" rows="3" value={form.description} onChange={handleChange} />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Booth'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBooth;


