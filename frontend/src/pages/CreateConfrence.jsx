import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import '../styles/conference.css';

const CreateConference = () => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    agenda: "",
    website: "",
    budget: "",
    fundingSource: "GUC",
    extraResources: "",
    startDate: "",
    endDate: "",
    location: "",
    capacity: ""
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConferences = async () => {
      try {
        const res = await axios.get("/api/events?type=conference");
        setConferences(res.data);
      } catch (err) {
        setMsg("Error fetching conferences");
      }
    };
    fetchConferences();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const res = await axios.post("/api/events/conference", form);
      setMsg(res.data.msg);
      setForm({
        title: "",
        description: "",
        agenda: "",
        website: "",
        budget: "",
        fundingSource: "GUC",
        extraResources: "",
        startDate: "",
        endDate: "",
        location: "",
        capacity: ""
      });
    } catch (err) {
      setMsg(
        err.response?.data?.msg ||
        "Error creating conference"
      );
    }
    setLoading(false);
  };

  const [conferences, setConferences] = useState([]);

  const handleEdit = (id) => {
    navigate(`/edit-conference/${id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this conference?")) return;
    try {
      await axios.delete(`/api/events/${id}`);
      setConferences(conferences.filter(c => c._id !== id));
      setMsg("Conference deleted successfully");
    } catch (err) {
      setMsg(err.response?.data?.msg || "Error deleting conference");
    }
  };

  return (
    <div className="page-wrap">
      <div className="page-inner">
        <div className="page-header">
          <div>
            <h1>Create New Conference</h1>
            <div className="muted">Add all the details for your new conference</div>
          </div>
        </div>

        {msg && (
          <div className={`alert ${msg.toLowerCase().includes('error') ? 'alert-error' : 'alert-success'}`}>
            {msg}
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-group">
              <label>Conference Name *</label>
              <input type="text" name="title" className="input" value={form.title} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Short Description</label>
              <input type="text" name="description" className="input" value={form.description} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Agenda *</label>
              <textarea name="agenda" className="textarea" value={form.agenda} onChange={handleChange} required />
            </div>

            <div className="row two">
              <div className="form-group">
                <label>Website Link *</label>
                <input type="url" name="website" className="input" value={form.website} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Location *</label>
                <input type="text" name="location" className="input" value={form.location} onChange={handleChange} required />
              </div>
            </div>

            <div className="row two">
              <div className="form-group">
                <label>Required Budget *</label>
                <input type="number" name="budget" className="input" value={form.budget} onChange={handleChange} min="0" step="0.01" required />
              </div>
              <div className="form-group">
                <label>Source of Funding *</label>
                <select name="fundingSource" className="input" value={form.fundingSource} onChange={handleChange} required>
                  <option value="GUC">GUC</option>
                  <option value="external">External</option>
                </select>
              </div>
            </div>

            <div className="row two">
              <div className="form-group">
                <label>Start Date & Time *</label>
                <input type="datetime-local" name="startDate" className="input" value={form.startDate} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>End Date & Time *</label>
                <input type="datetime-local" name="endDate" className="input" value={form.endDate} onChange={handleChange} required />
              </div>
            </div>

            <div className="row two align-end">
              <div className="form-group">
                <label>Capacity</label>
                <input type="number" name="capacity" className="input" value={form.capacity} onChange={handleChange} min="0" />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Conference'}
                </button>
              </div>
            </div>

          </form>
        </div>

        <div style={{ height: 16 }} />

        <div className="card">
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h2 style={{ margin: 0 }}>All Conferences</h2>
          </div>
          {msg && <div className="muted">{msg}</div>}
          <ul>
            {conferences.map(conf => (
              <li key={conf._id}>
                <strong>{conf.title}</strong> ({conf.startDate} - {conf.endDate})
                <button className="btn btn-outline" onClick={() => handleEdit(conf._id)}>Edit</button>
                <button className="btn btn-outline" onClick={() => handleDelete(conf._id)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
};

export default CreateConference;