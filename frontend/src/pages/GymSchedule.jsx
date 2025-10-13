import React, { useEffect, useMemo, useState } from 'react';
import { gymApiService } from '../api/gymApi';

const TYPES = ['Yoga', 'Pilates', 'Aerobics', 'Zumba', 'Crossfit', 'Strength', 'Cardio'];

const GymSchedule = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');

  const load = async () => {
    setLoading(true); setError('');
    const res = await gymApiService.getMonthlySessions(year, month);
    if (res.success) setSessions(res.data.sessions || []); else setError(res.message);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [year, month]);

  const groupedByDay = useMemo(() => {
    const map = new Map();
    for (const s of sessions) {
      if (typeFilter !== 'all' && (s.type || '').toLowerCase() !== typeFilter.toLowerCase()) continue;
      const d = new Date(s.date || s.startTime);
      const key = d.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return Array.from(map.entries()).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  }, [sessions, typeFilter]);

  const monthName = new Date(year, month, 1).toLocaleString(undefined, { month: 'long' });

  const shiftMonth = (delta) => {
    const n = new Date(year, month + delta, 1);
    setYear(n.getFullYear());
    setMonth(n.getMonth());
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div className="container">
        <div className="card">
          <div className="card-header">
            <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Gym Schedule</h1>
            <p className="card-subtitle">View sessions for the selected month.</p>
          </div>

          {/* Toolbar */}
          <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
            <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '1rem' }}>
              {/* Month navigation */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <button
                  aria-label="Previous month"
                  title="Previous month"
                  className="btn btn-outline"
                  onClick={() => shiftMonth(-1)}
                  style={{ width: 44, minWidth: 44, height: 44, borderRadius: 999 }}
                >
                  ‹
                </button>
                <div style={{
                  padding: '8px 16px',
                  background: 'var(--white)',
                  border: '1px solid var(--medium-gray)',
                  borderRadius: 10,
                  fontWeight: 700,
                  color: 'var(--charcoal-black)'
                }}>
                  {monthName} {year}
                </div>
                <button
                  aria-label="Next month"
                  title="Next month"
                  className="btn btn-outline"
                  onClick={() => shiftMonth(1)}
                  style={{ width: 44, minWidth: 44, height: 44, borderRadius: 999 }}
                >
                  ›
                </button>
              </div>

              {/* Type filter */}
              <div className="form-group" style={{ minWidth: 240, margin: 0 }}>
                <label className="form-label">Type</label>
                <select className="form-input" value={typeFilter} onChange={(e)=> setTypeFilter(e.target.value)}>
                  <option value="all">All Types</option>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
            {loading ? (
              <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto' }}></div>
                  <div style={{ marginTop: '1rem', color: 'var(--text-light)' }}>Loading schedule...</div>
                </div>
              </div>
            ) : error ? (
              <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
                  <div style={{ color: 'var(--guc-red)', fontWeight: 600 }}>Failed to load gym sessions</div>
                  <div style={{ color: 'var(--text-light)', fontSize: 14, marginTop: 6 }}>{error}</div>
                  <button className="btn btn-outline" onClick={load} style={{ marginTop: 12 }}>Retry</button>
                </div>
              </div>
            ) : groupedByDay.length === 0 ? (
              <div className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                  <div style={{ color: 'var(--charcoal-black)', fontWeight: 600 }}>No sessions for {monthName}</div>
                  <div style={{ color: 'var(--text-light)', fontSize: 14, marginTop: 6 }}>
                    Try a different month or filter.
                  </div>
                </div>
              </div>
            ) : (
              groupedByDay.map(([dayLabel, list]) => (
                <div key={dayLabel} className="card" style={{ backgroundColor: 'var(--light-gray)' }}>
                  <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 700, color: 'var(--charcoal-black)' }}>{dayLabel}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{list.length} session{list.length > 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {list.map((s, idx) => {
                        const start = new Date(s.startTime || s.date);
                        const duration = s.durationMinutes || s.duration || 60;
                        const end = new Date(start.getTime() + duration * 60000);
                        return (
                          <div key={s._id || s.id || idx} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: '0.75rem', background: 'var(--white)', border: '1px solid var(--medium-gray)', borderRadius: 10, padding: '0.75rem 1rem' }}>
                            <div style={{
                              background: 'var(--guc-red)',
                              color: 'var(--white)',
                              fontWeight: 700,
                              borderRadius: 8,
                              padding: '6px 10px',
                              minWidth: 80,
                              textAlign: 'center'
                            }}>
                              {start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--charcoal-black)' }}>{s.type}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-light)' }}>👤 {s.instructor || 'TBD'} • ⏱ {duration} min</div>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-light)' }}>
                              Ends {end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GymSchedule;


