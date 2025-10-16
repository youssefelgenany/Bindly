import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Confrences = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const fetchConfs = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/events?type=conference');
        const list = Array.isArray(res.data) ? res.data : (res.data.events || []);
        list.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        setConferences(list);
      } catch (err) {
        setMsg(err.response?.data?.msg || 'Error loading conferences');
      } finally {
        setLoading(false);
      }
    };
    fetchConfs();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this conference? Allowed only if no one registered.')) return;
    try {
      await axios.delete(`/api/events/${id}`);
      setConferences(prev => prev.filter(c => c._id !== id));
      setMsg('Conference deleted successfully');
    } catch (err) {
      setMsg(err.response?.data?.msg || 'Error deleting conference');
    }
  };

  const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString();
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
      }}>
        <div>
          <h1 style={{ margin: 0 }}>Conferences</h1>
          <p style={{ margin: '6px 0 0', color: '#666' }}>Create, edit or delete conferences</p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {(user?.userType === 'Events Office' || user?.role === 'event_office' || user?.role === 'admin') && (
            <Link to="/create-conference" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Create Conference
            </Link>
          )}
        </div>
      </div>

      {msg && <div style={{ marginBottom: 12, color: msg.toLowerCase().includes('error') ? 'crimson' : 'green' }}>{msg}</div>}

      {loading ? (
        <div>Loading conferences...</div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16
          }}>
            {conferences.map(conf => (
              <div key={conf._id} style={{
                background: '#fff',
                padding: 16,
                borderRadius: 8,
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{conf.title}</h3>
                    <div style={{ color: '#666', fontSize: 13 }}>
                      {conf.location} • {fmtDate(conf.startDate)} — {fmtDate(conf.endDate)}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#333' }}>{conf.type}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>Capacity: {conf.capacity ?? '—'}</div>
                  </div>
                </div>

                <p style={{ marginTop: 12, color: '#444' }}>{conf.description}</p>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {/* Edit button navigates to EditConfrences page */}
                  <Link
                    to={`/edit-conference/${conf._id}`}
                    className="btn btn-outline"
                    onClick={() => { /* close sidebar handled globally if needed */ }}
                    style={{ textDecoration: 'none' }}
                  >
                    Edit
                  </Link>

                  <button onClick={() => handleDelete(conf._id)} className="btn btn-danger">Delete</button>

                  <a href={conf.website} target="_blank" rel="noreferrer" className="btn btn-link">Website</a>
                </div>
              </div>
            ))}
          </div>

          {conferences.length === 0 && (
            <div style={{ marginTop: 20, color: '#666' }}>
              No conferences found.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Confrences;