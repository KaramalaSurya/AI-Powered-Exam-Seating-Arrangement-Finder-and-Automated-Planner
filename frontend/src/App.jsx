import React, { useState, useEffect } from 'react';
import StudentSearch from './components/StudentSearch';
import AdminPortal from './components/AdminPortal';
import AdminLogin from './components/AdminLogin';
import { API_BASE_URL } from './config';
import { 
  Search, 
  ShieldCheck, 
  HelpCircle, 
  Activity, 
  Server, 
  Radio
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState('student'); // 'student', 'admin'
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking', 'online', 'offline'
  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_token') || '');

  useEffect(() => {
    let timer;
    const checkBackend = async (attempts = 0) => {
      try {
        const res = await fetch(`${API_BASE_URL}/`, { cache: 'no-store' });
        const data = await res.json();
        if (data.status === 'online') {
          setBackendStatus('online');
          return;
        }
      } catch (e) {
        if (attempts < 3) {
          setBackendStatus('checking');
          timer = setTimeout(() => checkBackend(attempts + 1), 4000);
          return;
        }
      }
      setBackendStatus('offline');
    };
    checkBackend();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      {/* Developer Ops Top Strip (Admin Only) */}
      {view === 'admin' && (
        <div style={{
          background: '#0f172a',
          color: '#cbd5e1',
          padding: '0.45rem 1.5rem',
          fontSize: '0.72rem',
          fontWeight: 600,
          fontFamily: 'monospace',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Radio size={12} className="spinner" /> SYSTEM CONSOLE v1.5.0
            </span>
            <span style={{ color: '#475569' }}>|</span>
            <span>NODE_ENV: PRODUCTION</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ 
              width: '7px', 
              height: '7px', 
              background: backendStatus === 'online' ? '#10b981' : backendStatus === 'offline' ? '#ef4444' : '#f59e0b', 
              borderRadius: '50%',
              display: 'inline-block'
            }} />
            <span>
              API ENDPOINT: {
                backendStatus === 'online' 
                  ? `ONLINE (${API_BASE_URL})` 
                  : backendStatus === 'offline' 
                    ? `OFFLINE (${API_BASE_URL})` 
                    : 'CONNECTING...'
              }
            </span>
          </div>
        </div>
      )}

      <div className="container">
        {/* Top Navigation & Branding Header */}
        <header className="animate-fade-in" style={{ marginTop: '0.5rem', marginBottom: '2.5rem' }}>
          <a href="/" className="logo" onClick={(e) => { e.preventDefault(); setView('student'); }} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  SeatX
                </span>
              </div>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0.2rem 0 0 0', lineHeight: 1.2 }}>
                AI-Powered Examination Seating & Automated Planner
              </p>
            </div>
          </a>

          {/* View Switch Tabs */}
          <div className="header-actions">
            <div className="nav-tabs">
              <button 
                onClick={() => setView('student')} 
                className={`nav-btn ${view === 'student' ? 'active' : ''}`}
              >
                <Search size={16} /> Student Finder
              </button>
              <button 
                onClick={() => setView('admin')} 
                className={`nav-btn ${view === 'admin' ? 'active' : ''}`}
              >
                <ShieldCheck size={16} /> Admin Portal
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main style={{ minHeight: '60vh' }}>
          {view === 'student' ? (
            <StudentSearch />
          ) : (
            adminToken ? (
              <AdminPortal token={adminToken} onLogout={() => {
                localStorage.removeItem('admin_token');
                setAdminToken('');
              }} />
            ) : (
              <AdminLogin onLoginSuccess={(token) => setAdminToken(token)} />
            )
          )}
        </main>

        {/* Footer Info */}
        <footer style={{ marginTop: '4.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <div>
            <p style={{ fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>© 2026 AI-Powered Examination Seating Planning and Student Seating Finder System</p>
            <p style={{ marginTop: '0.35rem', margin: 0, fontSize: '0.78rem' }}>Maintained by Academic Planning Group & Controller of Examinations.</p>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <a href="#help" onClick={(e) => { e.preventDefault(); alert('SeatX Student Finder Help:\n\n1. Enter your 10-character college roll number in the search bar.\n2. Click "Search Seat" to generate your Hall Ticket Slip and Classroom Map.\n3. Click "Print Seating Slip" to save or print your ticket.'); }} style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
              <HelpCircle size={15} /> System Guide
            </a>
            <span style={{ fontWeight: 700, fontSize: '0.75rem', background: '#e2e8f0', padding: '0.2rem 0.6rem', borderRadius: '6px', color: '#334155' }}>
              v1.5.0 (REACT + FASTAPI)
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
