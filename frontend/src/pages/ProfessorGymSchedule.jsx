import React, { useEffect, useMemo, useState } from 'react';
import { professorApiService } from '../api/professorApi';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ProfessorGymSchedule = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);

  const load = async (y, m) => {
    try {
      setLoading(true);
      setError('');
      const result = await professorApiService.getGymScheduleMonth({ year: y, month: m });
      if (result.success) {
        // Ensure sessions is an array and filter out invalid sessions
        const sessionsData = result.data.sessions || [];
        const validSessions = sessionsData.filter(s => s && s.date);
        setSessions(validSessions);
      } else {
        setError(result.message || 'Failed to load gym schedule');
      }
    } catch (e) {
      console.error('Error loading gym schedule:', e);
      setError('Failed to load gym schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(year, month);
  }, [year, month]);

  const firstOfMonth = useMemo(() => new Date(year, month - 1, 1), [year, month]);
  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);
  const startDay = useMemo(() => firstOfMonth.getDay(), [firstOfMonth]);

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };

  const sessionsByDate = useMemo(() => {
    const map = {};
    sessions.forEach(s => {
      // Skip sessions with invalid data
      if (!s || !s.date) return;
      
      try {
        const d = new Date(s.date);
        // Skip if date is invalid
        if (isNaN(d.getTime())) return;
        
        const key = d.toISOString().slice(0,10);
        if (!map[key]) map[key] = [];
        map[key].push(s);
      } catch (error) {
        console.warn('Invalid session data:', s, error);
        return;
      }
    });
    return map;
  }, [sessions]);

  const formatDateKey = (y, m, day) => new Date(y, m - 1, day).toISOString().slice(0,10);

  return (
    <div style={{ padding: '2rem' }}>
      <div className="container">
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="card-title" style={{ color: 'var(--guc-red)' }}>Gym Schedule</h1>
              <p className="card-subtitle">Browse monthly sessions.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button className="btn" onClick={prevMonth}>{'<'} Prev</button>
              <div style={{ color: 'var(--charcoal-black)', fontWeight: 600 }}>{firstOfMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
              <button className="btn" onClick={nextMonth}>Next {'>'}</button>
            </div>
          </div>

          {error && (
            <div className="alert alert-error" style={{ margin: '1rem' }}>{error}</div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-light)' }}>Loading schedule...</div>
          ) : (
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-light)' }}>
                {daysOfWeek.map(d => (<div key={d} style={{ textAlign: 'center', fontWeight: 600 }}>{d}</div>))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
                {Array.from({ length: startDay }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ minHeight: 100, background: 'var(--light-gray)', border: '1px solid var(--medium-gray)', borderRadius: 6 }} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const key = formatDateKey(year, month, day);
                  const daySessions = sessionsByDate[key] || [];
                  return (
                    <div key={key} style={{ minHeight: 120, background: 'var(--white)', border: '1px solid var(--medium-gray)', borderRadius: 6, padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-light)', textAlign: 'right' }}>{day}</div>
                      {daySessions.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text-light)', textAlign: 'center', marginTop: '0.5rem' }}>No sessions</div>
                      ) : (
                        daySessions.map((s) => {
                          try {
                            return (
                              <div key={s._id} style={{ border: '1px solid var(--medium-gray)', borderRadius: 6, padding: '0.5rem' }}>
                                <div style={{ fontWeight: 600, color: 'var(--charcoal-black)' }}>{s.title || s.type.charAt(0).toUpperCase() + s.type.slice(1)}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{s.startTime || 'TBD'} • {s.durationMinutes || 60} mins</div>
                                <div style={{ fontSize: 12, color: 'var(--text-light)' }}>Capacity: {s.maxParticipants || 'TBD'}</div>
                              </div>
                            );
                          } catch (error) {
                            console.warn('Error rendering session:', s, error);
                            return null;
                          }
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessorGymSchedule;


