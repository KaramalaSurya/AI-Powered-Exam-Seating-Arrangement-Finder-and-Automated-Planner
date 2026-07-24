import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Loader2, 
  X, 
  ShieldAlert, 
  Clock, 
  Grid, 
  Ban, 
  HelpCircle, 
  CheckCircle2, 
  Users, 
  MapPin, 
  BookOpen, 
  Calendar, 
  Award, 
  Printer, 
  Sparkles, 
  AlertCircle,
  QrCode
} from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function StudentSearch() {
  const [rollNumber, setRollNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [activeSession, setActiveSession] = useState('');
  const [activeSlots, setActiveSlots] = useState([]);

  useEffect(() => {
    const fetchActiveSession = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/student/active-sessions`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setActiveSession(data.map(s => s.name).join(', '));
        } else {
          setActiveSession('None');
        }
      } catch (e) {
        console.error('Failed to fetch active session:', e);
      }
    };
    
    const fetchActiveSlots = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/student/active-slots`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setActiveSlots(data);
        }
      } catch (e) {
        console.error('Failed to fetch active slots:', e);
      }
    };

    fetchActiveSession();
    fetchActiveSlots();
  }, []);

  const handleSearch = async (targetRoll) => {
    const queryRoll = (targetRoll || rollNumber).trim();
    if (!queryRoll) {
      setError('Please enter a valid hall ticket / roll number.');
      return;
    }
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/student/search?roll_number=${encodeURIComponent(queryRoll)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to find seating arrangement for the specified roll number.');
      }
      
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "";
    window.print();
    document.title = originalTitle;
  };

  const getShortSubject = (subject) => {
    if (!subject) return '—';
    const parenMatch = subject.match(/\(([^)]+)\)/);
    if (parenMatch) {
      return parenMatch[1];
    }
    const lower = subject.toLowerCase();
    if (lower.includes('machine learning')) return 'ML';
    if (lower.includes('deep learning')) return 'DL';
    if (lower.includes('computer networks')) return 'CN';
    if (lower.includes('software engineering')) return 'SE';
    if (lower.includes('universal human values')) return 'UHV';
    if (lower.includes('discrete mathematics')) return 'DM';
    return subject.substring(0, 8);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Side-by-Side Search and Instructions Panel */}
      <div className="grid-2">
        {/* Finder Form Panel */}
        <div className="glass-panel card-glow" style={{ padding: '2.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--primary-gradient)' }} />
          
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
            Find Your Seating
          </h2>
          
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
            Enter your college roll number to instantly retrieve your exam block, room number, and seat coordinates.
          </p>

          <div className="search-row">
            <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Enter Roll Number (e.g. 24691A3101)"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="input-field"
                style={{ 
                  width: '100%', 
                  paddingLeft: '3rem', 
                  paddingRight: rollNumber ? '2.5rem' : '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontWeight: 600
                }}
              />
              <Search 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '1.2rem', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              {rollNumber && (
                <button
                  type="button"
                  onClick={() => setRollNumber('')}
                  style={{
                    position: 'absolute',
                    right: '0.8rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.2rem',
                    borderRadius: '50%'
                  }}
                  title="Clear input"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button 
              onClick={() => handleSearch()} 
              disabled={loading} 
              className="btn-primary"
              style={{ minWidth: '140px' }}
            >
              {loading ? (
                <Loader2 className="spinner" size={18} />
              ) : (
                <Search size={18} />
              )}
              {loading ? 'Searching...' : 'Search Seat'}
            </button>
          </div>

          <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }} />
            <span>Format: 10-character official institution roll number</span>
          </div>
        </div>

        {/* Examination Branch Notice Board panel */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#fafcff', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="pulse-dot" style={{ width: '8px', height: '8px', background: '#dc2626', borderRadius: '50%' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-main)' }}>
                EXAMINATION BRANCH NOTICE BOARD
              </h3>
            </div>
            <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>IMPORTANT</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <ShieldAlert size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--text-main)' }}>Mandatory Identification:</strong> All candidates must carry their physical Hall Ticket and college ID card.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <Clock size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--text-main)' }}>Reporting Time:</strong> Candidates must report to their respective exam halls at least <strong>15 minutes</strong> before start time.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <Grid size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--text-main)' }}>Seating System:</strong> Arrangements follow the right-to-left serpentine zig-zag scheme starting at bench <code>001</code>.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <Ban size={16} style={{ color: 'var(--error)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--text-main)' }}>Prohibited Items:</strong> Mobile phones, smartwatches, notes, and programmable calculators are strictly forbidden.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <HelpCircle size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: 'var(--text-main)' }}>Support:</strong> Report discrepancies immediately to the Block In-charge or Chief Superintendent.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Exam Sessions Status Dashboard */}
      {activeSlots.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          {/* Header block with legend */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Active Exam Sessions
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.2rem 0 0 0' }}>
                Real-time status of departmental seating arrangements.
              </p>
            </div>
            
            {/* Status Legend indicators */}
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', fontWeight: 600 }}>
              <span className="badge badge-success" style={{ padding: '0.35rem 0.75rem' }}>
                <span style={{ width: '6px', height: '6px', background: 'var(--accent)', borderRadius: '50%', display: 'inline-block' }} />
                Seating Published
              </span>
              <span style={{ 
                background: '#f1f5f9', 
                color: 'var(--text-muted)', 
                border: '1px solid var(--border-color)', 
                padding: '0.35rem 0.75rem', 
                borderRadius: '30px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <span style={{ width: '6px', height: '6px', background: '#94a3b8', borderRadius: '50%', display: 'inline-block' }} />
                Draft / Processing
              </span>
            </div>
          </div>

          {/* Cards Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '1.25rem' 
          }}>
            {activeSlots.map((slot, index) => {
              const isPublished = slot.status === 'Published';
              return (
                <div 
                  key={index} 
                  className="glass-panel card-hover" 
                  style={{ 
                    padding: '1.5rem', 
                    position: 'relative',
                    borderLeft: isPublished ? '4px solid var(--accent)' : '4px solid #94a3b8',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '190px'
                  }}
                >
                  <div>
                    {/* Header: Department + Status Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {slot.department}
                      </span>
                      {isPublished ? (
                        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                          <CheckCircle2 size={12} /> Published
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Loader2 size={12} className="spinner" /> Processing
                        </span>
                      )}
                    </div>

                    {/* Course Code & Title */}
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.4rem 0', color: 'var(--text-main)', lineHeight: 1.35 }}>
                      {slot.subject_code}: {slot.subject_name}
                    </h3>
                    
                    {/* Exam Location */}
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={14} style={{ color: 'var(--primary)' }} /> {slot.exam_hall}
                    </p>
                  </div>

                  {/* Footer Stats section */}
                  <div style={{ marginTop: '1.25rem' }}>
                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.6rem 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Users size={15} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Students:</span>
                        <strong style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: 800 }}>{slot.students_count}</strong>
                      </div>
                      
                      {isPublished ? (
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700 }}>
                          Live
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          ETA ~10m
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="glass-panel animate-fade-in" style={{ padding: '1.25rem 1.5rem', borderLeft: '4px solid var(--error)', background: '#fef2f2', display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
          <AlertCircle size={20} style={{ color: 'var(--error)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ color: '#991b1b', fontWeight: 700, margin: 0, fontSize: '0.95rem' }}>{error}</p>
            <p style={{ fontSize: '0.83rem', color: '#7f1d1d', margin: '0.25rem 0 0 0' }}>
              Please double check your hall ticket number prefix or contact the examination coordinator if your seating has not been published yet.
            </p>
          </div>
        </div>
      )}

      {/* Result Slip & Grid */}
      {result && (
        <div className="grid-2">
          {/* Seating Slip Card */}
          <div className="glass-panel print-slip card-glow" style={{ padding: '2.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: '-10%', right: '-10%', width: '160px', height: '160px',
              background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)', pointerEvents: 'none'
            }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px dashed var(--border-color)', paddingBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-success" style={{ fontWeight: 700, fontSize: '0.7rem' }}>
                    <Award size={12} /> OFFICIAL HALL TICKET SLIP
                  </span>
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>{result.session_name}</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', background: 'rgba(30, 58, 138, 0.06)', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(30, 58, 138, 0.12)' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>
                  Seat {result.seating_details.seat_number}
                </span>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginTop: '2px' }}>
                  Assigned Seat Number
                </span>
              </div>
            </div>

            {/* Info Fields */}
            <div className="slip-info-grid">
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(30, 58, 138, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>Roll Number</p>
                  <p style={{ fontWeight: 800, color: 'var(--text-main)', margin: 0, fontSize: '0.95rem' }}>{result.roll_number}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={18} style={{ color: 'var(--secondary)' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>Exam Block</p>
                  <p style={{ fontWeight: 800, color: 'var(--text-main)', margin: 0, fontSize: '0.95rem' }}>{result.seating_details.block}</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(5, 150, 105, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>Subject & Room</p>
                  <p style={{ fontWeight: 800, color: 'var(--text-main)', margin: 0, fontSize: '0.9rem' }}>{result.seating_details.subject} (Room {result.seating_details.room_name})</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(217, 119, 6, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={18} style={{ color: 'var(--warning)' }} />
                </div>
                <div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, fontWeight: 600 }}>Date & Schedule</p>
                  <p style={{ fontWeight: 800, color: 'var(--text-main)', margin: 0, fontSize: '0.85rem' }}>{result.seating_details.exam_date} | {result.seating_details.exam_time}</p>
                </div>
              </div>
            </div>

            {/* Grid coordinates */}
            <div style={{ padding: '1rem', background: '#f1f5f9', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Row</span>
                <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>{result.seating_details.row + 1}</p>
              </div>
              <div style={{ width: '1px', height: '32px', background: 'var(--border-color)' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Bench Column</span>
                <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>{result.seating_details.column + 1}</p>
              </div>
              <div style={{ width: '1px', height: '32px', background: 'var(--border-color)' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Desk Position</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)', margin: 0 }}>
                  {result.seating_details.students_per_bench === 1 ? 'Single Seat' : result.seating_details.side}
                </p>
              </div>
              <div style={{ width: '1px', height: '32px', background: 'var(--border-color)' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Bench No</span>
                <p style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--secondary)', margin: 0 }}>{result.seating_details.bench_number}</p>
              </div>
            </div>

            {/* QR Code and Actions */}
            <div className="slip-footer">
              <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(`Exam-System: Roll ${result.roll_number}, Block ${result.seating_details.block}, Room ${result.seating_details.room_name}, Seat ${result.seating_details.seat_number}`)}`}
                  alt="Seating QR Code"
                  style={{ width: '85px', height: '85px', display: 'block' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <QrCode size={15} style={{ color: 'var(--primary)' }} /> Scan QR with mobile phone for fast navigation on campus.
                </p>
                <button 
                  onClick={handlePrint} 
                  className="btn-primary no-print" 
                  style={{ padding: '0.65rem 1.2rem', fontSize: '0.9rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Printer size={16} /> Print Seating Slip
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Classroom Grid View */}
          <div className="glass-panel print-layout" style={{ padding: '2.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Classroom Layout</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>Room {result.seating_details.room_name} Seating Grid Map</p>
              </div>
              
              {/* Legend */}
              <div style={{ display: 'flex', gap: '0.85rem', fontSize: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, color: 'var(--primary)' }}>
                  <span style={{ width: '10px', height: '10px', background: 'var(--primary)', borderRadius: '3px' }} />
                  Your Seat
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <span style={{ width: '10px', height: '10px', background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '3px' }} />
                  Occupied
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <span style={{ width: '10px', height: '10px', border: '1px dashed #94a3b8', borderRadius: '3px' }} />
                  Vacant
                </span>
              </div>
            </div>

            {/* Grid Map */}
            <div className="classroom-map-container">
              <div className="podium-screen">Blackboard / Proctor Table (Front)</div>

              <div 
                className="classroom-grid"
                style={{ 
                  gridTemplateColumns: `repeat(${result.seating_details.room_grid[0]?.length || 4}, 1fr)` 
                }}
              >
                {result.seating_details.room_grid.map((rowCells, rIdx) => 
                  rowCells.map((cell, cIdx) => (
                    <div 
                      key={`${rIdx}-${cIdx}`} 
                      className="bench-cell"
                      style={result.seating_details.students_per_bench === 1 ? { gridTemplateColumns: '1fr' } : {}}
                    >
                      {/* Bench number badge */}
                      <span className="bench-number-badge">{cell.bench_number}</span>
                      
                      {/* Left seat of the bench */}
                      {cell.left && (() => {
                        const isHighlighted = cell.left.highlighted;
                        const isEmpty = cell.left.roll === 'Empty';
                        const isSubjectA = (rIdx + cIdx + 0) % 2 === 0;
                        const seatStyle = !isHighlighted && !isEmpty ? {
                          background: isSubjectA ? 'rgba(59, 130, 246, 0.06)' : 'rgba(16, 185, 129, 0.06)',
                          color: isSubjectA ? 'var(--primary)' : 'var(--accent)',
                          border: isSubjectA ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'
                        } : {};
                        return (
                          <div 
                            className={`seat ${cell.left.roll === 'Empty' ? 'empty' : ''} ${cell.left.highlighted ? 'my-seat' : ''}`}
                            title={cell.left.roll}
                            style={seatStyle}
                          >
                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                              {cell.left.roll === 'Empty' ? '—' : cell.left.roll.slice(-4)}
                            </span>
                            <span className="seat-label" style={{ fontSize: '0.58rem', opacity: 0.85 }}>
                              {cell.left.roll === 'Empty' ? 'Vacant' : getShortSubject(cell.left.subject)}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Right seat of the bench */}
                      {result.seating_details.students_per_bench === 2 && cell.right && (() => {
                        const isHighlighted = cell.right.highlighted;
                        const isEmpty = cell.right.roll === 'Empty';
                        const isSubjectA = (rIdx + cIdx + 1) % 2 === 0;
                        const seatStyle = !isHighlighted && !isEmpty ? {
                          background: isSubjectA ? 'rgba(59, 130, 246, 0.06)' : 'rgba(16, 185, 129, 0.06)',
                          color: isSubjectA ? 'var(--primary)' : 'var(--accent)',
                          border: isSubjectA ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'
                        } : {};
                        return (
                          <div 
                            className={`seat ${cell.right.roll === 'Empty' ? 'empty' : ''} ${cell.right.highlighted ? 'my-seat' : ''}`}
                            title={cell.right.roll}
                            style={seatStyle}
                          >
                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                              {cell.right.roll === 'Empty' ? '—' : cell.right.roll.slice(-4)}
                            </span>
                            <span className="seat-label" style={{ fontSize: '0.58rem', opacity: 0.85 }}>
                              {cell.right.roll === 'Empty' ? 'Vacant' : getShortSubject(cell.right.subject)}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  ))
                )}
              </div>
              
              <div style={{ textTransform: 'uppercase', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.12em', marginTop: '0.5rem' }}>
                Back of Classroom (Entrance Door)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
