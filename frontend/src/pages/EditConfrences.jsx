import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const EditConfrences = () => {
  const { id } = useParams();
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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConference = async () => {
      try {
        const res = await axios.get(`/api/events/${id}`);
        setForm({
          ...res.data,
          startDate: res.data.startDate ? res.data.startDate.slice(0, 16) : "",
          endDate: res.data.endDate ? res.data.endDate.slice(0, 16) : ""
        });
      } catch (err) {
        setMsg("Error loading conference");
      }
    };
    fetchConference();
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/events/${id}`, form);
      setMsg("Conference updated!");
      setTimeout(() => navigate("/"), 1000);
    } catch (err) {
      setMsg(err.response?.data?.msg || "Error updating conference");
    }
  };

  return (
    <div>
      <h2>Edit Conference</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="title" value={form.title} onChange={handleChange} required />
        <input type="text" name="description" value={form.description} onChange={handleChange} />
        <textarea name="agenda" value={form.agenda} onChange={handleChange} required />
        <input type="url" name="website" value={form.website} onChange={handleChange} required />
        <input type="number" name="budget" value={form.budget} onChange={handleChange} required />
        <select name="fundingSource" value={form.fundingSource} onChange={handleChange} required>
          <option value="GUC">GUC</option>
          <option value="external">External</option>
        </select>
        <input type="text" name="extraResources" value={form.extraResources} onChange={handleChange} />
        <input type="datetime-local" name="startDate" value={form.startDate} onChange={handleChange} required />
        <input type="datetime-local" name="endDate" value={form.endDate} onChange={handleChange} required />
        <input type="text" name="location" value={form.location} onChange={handleChange} required />
        <input type="number" name="capacity" value={form.capacity} onChange={handleChange} />
        <button type="submit">Update Conference</button>
        {msg && <div>{msg}</div>}
      </form>
    </div>
  );
};

export default EditConfrences;