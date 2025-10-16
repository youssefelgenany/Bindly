import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import "../styles/conference.css"; // new stylesheet

const EditConfrences = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

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
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/events/${id}`);
        const e = res.data;
        setForm({
          title: e.title || "",
          description: e.description || "",
          agenda: e.agenda || "",
          website: e.website || "",
          budget: e.budget ?? "",
          fundingSource: e.fundingSource || "GUC",
          extraResources: e.extraResources || "",
          startDate: e.startDate ? e.startDate.slice(0, 16) : "",
          endDate: e.endDate ? e.endDate.slice(0, 16) : "",
          location: e.location || "",
          capacity: e.capacity ?? ""
        });
      } catch (err) {
        setMsg(err.response?.data?.msg || "Error loading conference");
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null
      };
      await axios.put(`/api/events/${id}`, payload);
      setMsg("Conference updated");
      setTimeout(() => navigate("/confrences"), 900);
    } catch (err) {
      setMsg(err.response?.data?.msg || "Error updating conference");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-wrap">
      <div className="page-inner">
        <header className="page-header">
          <div>
            <h1>Edit Conference</h1>
            <p className="muted">Modify conference details</p>
          </div>
          <div>
            <Link to="/confrences" className="btn btn-outline">Back to Conferences</Link>
          </div>
        </header>

        <main className="card">
          {msg && <div className={`alert ${msg.toLowerCase().includes("error") ? "alert-error" : "alert-success"}`}>{msg}</div>}
          {loading ? (
            <div className="loading">Loading...</div>
          ) : (
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="row two">
                <div className="form-group">
                  <label>Conference Name</label>
                  <input name="title" value={form.title} onChange={handleChange} className="input" required />
                </div>

                <div className="form-group">
                  <label>Location</label>
                  <input name="location" value={form.location} onChange={handleChange} className="input" required />
                </div>
              </div>

              <div className="form-group">
                <label>Short description</label>
                <input name="description" value={form.description} onChange={handleChange} className="input" />
              </div>

              <div className="form-group">
                <label>Full agenda</label>
                <textarea name="agenda" value={form.agenda} onChange={handleChange} className="textarea" rows={5} required />
              </div>

              <div className="row two">
                <div className="form-group">
                  <label>Website URL</label>
                  <input name="website" value={form.website} onChange={handleChange} className="input" required />
                </div>

                <div className="form-group">
                  <label>Extra required resources</label>
                  <input name="extraResources" value={form.extraResources} onChange={handleChange} className="input" />
                </div>
              </div>

              <div className="row two">
                <div className="form-group">
                  <label>Required budget</label>
                  <input name="budget" type="number" value={form.budget} onChange={handleChange} className="input" required />
                </div>

                <div className="form-group">
                  <label>Funding source</label>
                  <select name="fundingSource" value={form.fundingSource} onChange={handleChange} className="input">
                    <option value="GUC">GUC</option>
                    <option value="external">External</option>
                  </select>
                </div>
              </div>

              <div className="row two">
                <div className="form-group">
                  <label>Start date & time</label>
                  <input name="startDate" type="datetime-local" value={form.startDate} onChange={handleChange} className="input" required />
                </div>

                <div className="form-group">
                  <label>End date & time</label>
                  <input name="endDate" type="datetime-local" value={form.endDate} onChange={handleChange} className="input" required />
                </div>
              </div>

              <div className="row two align-end">
                <div className="form-group">
                  <label>Capacity</label>
                  <input name="capacity" type="number" value={form.capacity} onChange={handleChange} className="input" />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => navigate("/confrences")}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
                </div>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
};

export default EditConfrences;