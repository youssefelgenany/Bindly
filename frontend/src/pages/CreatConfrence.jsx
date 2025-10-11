import React, { useState } from "react";
import axios from "axios";

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

  return (
    <div className="create-conference-container">
      <h2>Create Conference</h2>
      <form onSubmit={handleSubmit} className="conference-form">
        <input
          type="text"
          name="title"
          placeholder="Conference Name"
          value={form.title}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="description"
          placeholder="Short Description"
          value={form.description}
          onChange={handleChange}
        />
        <textarea
          name="agenda"
          placeholder="Full Agenda"
          value={form.agenda}
          onChange={handleChange}
          required
        />
        <input
          type="url"
          name="website"
          placeholder="Conference Website Link"
          value={form.website}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="budget"
          placeholder="Required Budget"
          value={form.budget}
          onChange={handleChange}
          required
        />
        <select
          name="fundingSource"
          value={form.fundingSource}
          onChange={handleChange}
          required
        >
          <option value="GUC">GUC</option>
          <option value="external">External</option>
        </select>
        <input
          type="text"
          name="extraResources"
          placeholder="Extra Required Resources"
          value={form.extraResources}
          onChange={handleChange}
        />
        <input
          type="datetime-local"
          name="startDate"
          placeholder="Start Date & Time"
          value={form.startDate}
          onChange={handleChange}
          required
        />
        <input
          type="datetime-local"
          name="endDate"
          placeholder="End Date & Time"
          value={form.endDate}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="location"
          placeholder="Location"
          value={form.location}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="capacity"
          placeholder="Capacity"
          value={form.capacity}
          onChange={handleChange}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Conference"}
        </button>
        {msg && <div className="form-message">{msg}</div>}
      </form>
    </div>
  );
};

export default CreateConference;