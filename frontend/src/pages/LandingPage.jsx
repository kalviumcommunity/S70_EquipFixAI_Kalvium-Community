import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Wrench, Shield, ArrowRight, Sparkles, HardHat,
  UserCheck, Factory, Zap, Activity, Cpu, CheckCircle2,
  Radio, Layers, Compass
} from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const rolePortals = [
    {
      id: 'OPERATOR',
      title: 'Floor Operations & Triage',
      badge: 'Immediate Response',
      icon: HardHat,
      color: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.25)',
      desc: 'Report machine faults with real-time photographic telemetry, trigger cell alerts, and track immediate equipment operational states.'
    },
    {
      id: 'TECHNICIAN',
      title: 'Reliability & Diagnostics',
      badge: 'Deep RAG Diagnostics',
      icon: Wrench,
      color: '#34d399',
      glow: 'rgba(52, 211, 153, 0.25)',
      desc: 'Access grounded OEM vector manuals, execute ISO Lockout/Tagout (LOTO) protocols, and document atomic spare parts usage.'
    },
    {
      id: 'SUPERVISOR',
      title: 'Mission Control & Supervision',
      badge: 'Shift Orchestration',
      icon: UserCheck,
      color: '#fbbf24',
      glow: 'rgba(251, 191, 36, 0.25)',
      desc: 'Orchestrate technician work orders by skill matrix, monitor live cell harmonic anomalies, and authorize completed maintenance.'
    },
    {
      id: 'MANAGER',
      title: 'Executive Intelligence & Analytics',
      badge: 'Fleet Oversight',
      icon: Factory,
      color: '#c084fc',
      glow: 'rgba(192, 132, 252, 0.25)',
      desc: 'Constellation-wide uptime tracking, MTBF & MTTR mathematical modeling, automated regulatory audit logs, and CSV report exports.'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* --------------------------------------------------------------------
          1. Dynamic Cosmic Nebula Background (Animated GIF)
      {/* Full-page background — Deep Industrial Space Nebula Gradient */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(14, 165, 233, 0.25), rgba(255, 255, 255, 0)), radial-gradient(ellipse 60% 60% at 80% 80%, rgba(59, 130, 246, 0.18), transparent), #030712',
        zIndex: 0,
      }} />

      {/* Atmospheric Cosmic Mist & Nebula Vignette Overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 15%, rgba(14, 165, 233, 0.16) 0%, rgba(7, 12, 30, 0.74) 42%, rgba(2, 6, 18, 0.94) 100%)',
        zIndex: 1,
        pointerEvents: 'none'
      }} />

      {/* --------------------------------------------------------------------
          2. Frosted Cosmic Top Navigation
          -------------------------------------------------------------------- */}
      <header style={{
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        backgroundColor: 'rgba(5, 10, 24, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          maxWidth: '1320px',
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Brand */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 0 20px rgba(14, 165, 233, 0.5), inset 0 0 10px rgba(255, 255, 255, 0.3)'
            }}>
              <Wrench size={22} />
            </div>
            <div>
              <div style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                EquipFix<span style={{
                  background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>AI</span>
                <span style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  letterSpacing: '0.06em'
                }}>
                  ENTERPRISE
                </span>
              </div>
              <div style={{ fontSize: '0.675rem', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Autonomous Planetary Fleet Intelligence
              </div>
            </div>
          </Link>

          {/* Telemetry Indicator & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              display: 'none',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 12px',
              borderRadius: '20px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: '0.75rem',
              color: '#34d399',
              fontWeight: 600
            }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                boxShadow: '0 0 10px #10b981'
              }} />
              <span>Cosmic Telemetry Stream Active</span>
            </div>

            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="btn btn-primary"
                style={{
                  borderRadius: '8px',
                  padding: '9px 20px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  boxShadow: '0 0 18px rgba(14, 165, 233, 0.45)'
                }}
              >
                Launch Station Console <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  style={{
                    color: '#e2e8f0',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  }}
                >
                  Sign In to Station
                </Link>
                <Link
                  to="/register"
                  className="btn btn-primary"
                  style={{
                    borderRadius: '8px',
                    padding: '9px 20px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                    border: '1px solid rgba(56, 189, 248, 0.5)',
                    boxShadow: '0 0 20px rgba(14, 165, 233, 0.4)'
                  }}
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------------
          3. Hero Section & Constellation Intelligence Core
          -------------------------------------------------------------------- */}
      <section style={{
        position: 'relative',
        zIndex: 2,
        padding: '90px 24px 70px 24px',
        maxWidth: '1320px',
        margin: '0 auto',
        textAlign: 'center',
        flex: '1'
      }}>
        {/* Subtle Ambient Radial Spotlight */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '850px',
          height: '450px',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.22) 0%, rgba(99, 102, 241, 0.12) 40%, rgba(3, 7, 18, 0) 75%)',
          pointerEvents: 'none',
          zIndex: -1
        }} />

        <div style={{ maxWidth: '940px', margin: '0 auto' }}>
          {/* Mission Tagline Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '7px 20px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(15, 29, 61, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#38bdf8',
            marginBottom: '26px',
            letterSpacing: '0.06em',
            boxShadow: '0 0 25px rgba(14, 165, 233, 0.25)'
          }}>
            <Sparkles size={15} color="#38bdf8" />
            <span>DEEP-SPACE INDUSTRIAL AI • ZERO-DOWNTIME FLEET ORCHESTRATION</span>
          </div>

          {/* Main Headline */}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5.8vw, 4.4rem)',
            fontWeight: 900,
            lineHeight: 1.12,
            letterSpacing: '-0.035em',
            color: '#ffffff',
            marginBottom: '24px',
            textShadow: '0 4px 30px rgba(0, 0, 0, 0.8)'
          }}>
            Autonomous Fleet Intelligence for{' '}
            <span style={{
              background: 'linear-gradient(135deg, #ffffff 15%, #38bdf8 55%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 25px rgba(56, 189, 248, 0.4))'
            }}>
              Mission-Critical Operations
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(1.05rem, 2vw, 1.28rem)',
            color: '#cbd5e1',
            lineHeight: 1.65,
            maxWidth: '780px',
            margin: '0 auto 42px auto',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.6)'
          }}>
            Combining deep-retrieval RAG, real-time vibrational telemetry, OSHA Lockout/Tagout safety protocols, and automated work orders to navigate machinery health across production constellations.
          </p>

          {/* Call-to-Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px', flexWrap: 'wrap', marginBottom: '55px' }}>
            <Link
              to="/login"
              className="btn btn-primary btn-lg"
              style={{
                borderRadius: '10px',
                padding: '14px 36px',
                fontSize: '1.025rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                border: '1px solid rgba(56, 189, 248, 0.6)',
                boxShadow: '0 0 30px rgba(14, 165, 233, 0.55), 0 4px 15px rgba(0,0,0,0.5)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 0 40px rgba(14, 165, 233, 0.75)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(14, 165, 233, 0.55)';
              }}
            >
              Launch Station Console <ArrowRight size={20} />
            </Link>

            <Link
              to="/register"
              className="btn btn-secondary btn-lg"
              style={{
                borderRadius: '10px',
                padding: '14px 32px',
                fontSize: '1.025rem',
                fontWeight: 600,
                backgroundColor: 'rgba(11, 19, 41, 0.75)',
                backdropFilter: 'blur(12px)',
                color: '#e2e8f0',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#38bdf8';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
                e.currentTarget.style.color = '#e2e8f0';
              }}
            >
              Register Plant Profile
            </Link>
          </div>

          {/* ------------------------------------------------------------------
              Live Constellation Telemetry Strip (Frosted Glass Cards)
              ------------------------------------------------------------------ */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            marginBottom: '65px'
          }}>
            <div style={{
              backgroundColor: 'rgba(8, 15, 34, 0.72)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(56, 189, 248, 0.22)',
              borderRadius: '14px',
              padding: '18px 20px',
              textAlign: 'left',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Connected Fleet
                </span>
                <Cpu size={16} color="#38bdf8" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.02em' }}>
                8 Units
              </div>
              <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '4px' }}>
                Active telemetry nodes online
              </div>
            </div>

            <div style={{
              backgroundColor: 'rgba(8, 15, 34, 0.72)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(52, 211, 153, 0.22)',
              borderRadius: '14px',
              padding: '18px 20px',
              textAlign: 'left',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Fleet Uptime
                </span>
                <Activity size={16} color="#34d399" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#34d399', letterSpacing: '-0.02em' }}>
                99.98%
              </div>
              <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '4px' }}>
                ISO 13374 vibration compliant
              </div>
            </div>

            <div style={{
              backgroundColor: 'rgba(8, 15, 34, 0.72)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(251, 191, 36, 0.22)',
              borderRadius: '14px',
              padding: '18px 20px',
              textAlign: 'left',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  RAG Response
                </span>
                <Radio size={16} color="#fbbf24" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fbbf24', letterSpacing: '-0.02em' }}>
                &lt; 350 ms
              </div>
              <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '4px' }}>
                Vector retrieval citation speed
              </div>
            </div>

            <div style={{
              backgroundColor: 'rgba(8, 15, 34, 0.72)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(192, 132, 252, 0.22)',
              borderRadius: '14px',
              padding: '18px 20px',
              textAlign: 'left',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Safety Protocol
                </span>
                <Shield size={16} color="#c084fc" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#c084fc', letterSpacing: '-0.02em' }}>
                100% LOTO
              </div>
              <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '4px' }}>
                Strict lockout/tagout enforced
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------
              Live Operational Pipeline Display
              ------------------------------------------------------------------ */}
          <div style={{
            backgroundColor: 'rgba(8, 14, 32, 0.76)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '18px',
            padding: '24px',
            marginBottom: '70px',
            boxShadow: '0 15px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '18px',
              borderBottom: '1px solid rgba(30, 41, 59, 0.8)',
              paddingBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="#38bdf8" />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  End-to-End Plant Operations Pipeline
                </span>
              </div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.725rem',
                color: '#34d399',
                fontWeight: 700
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                Real-Time Synchronized
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              <div style={{
                backgroundColor: 'rgba(5, 10, 24, 0.8)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '10px',
                padding: '14px 12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>PHASE 1</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>Telemetry Trigger</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>Harmonics &amp; floor incident log</div>
              </div>

              <div style={{
                backgroundColor: 'rgba(5, 10, 24, 0.8)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '10px',
                padding: '14px 12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>PHASE 2</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>Supervisor Dispatch</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>Technician assignment &amp; WO</div>
              </div>

              <div style={{
                backgroundColor: 'rgba(14, 165, 233, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.5)',
                borderRadius: '10px',
                padding: '14px 12px',
                textAlign: 'center',
                boxShadow: '0 0 15px rgba(14, 165, 233, 0.25)'
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>PHASE 3</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#38bdf8' }}>AI RAG Diagnostics</div>
                <div style={{ fontSize: '0.72rem', color: '#bae6fd', marginTop: '4px' }}>Grounded OEM vector search</div>
              </div>

              <div style={{
                backgroundColor: 'rgba(5, 10, 24, 0.8)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '10px',
                padding: '14px 12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', marginBottom: '4px' }}>PHASE 4</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>Mission Clearance</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>Inventory deduction &amp; sign-off</div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------
              Role Portals Grid (Mission Stations)
              ------------------------------------------------------------------ */}
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontSize: '0.78rem',
              fontWeight: 800,
              color: '#38bdf8',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '18px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <Compass size={16} />
              <span>Select Your Operational Station Portal</span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '18px'
            }}>
              {rolePortals.map((portal) => {
                const Icon = portal.icon;
                return (
                  <div
                    key={portal.id}
                    style={{
                      backgroundColor: 'rgba(7, 14, 34, 0.74)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: `1px solid ${portal.color}35`,
                      borderRadius: '16px',
                      padding: '24px 22px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      position: 'relative',
                      boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 20px ${portal.glow}`
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = portal.color;
                      e.currentTarget.style.boxShadow = `0 15px 40px rgba(0,0,0,0.6), 0 0 30px ${portal.glow}`;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = `${portal.color}35`;
                      e.currentTarget.style.boxShadow = `0 10px 30px rgba(0,0,0,0.5), 0 0 20px ${portal.glow}`;
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          backgroundColor: `${portal.color}15`,
                          border: `1px solid ${portal.color}40`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: portal.color,
                          boxShadow: `0 0 15px ${portal.glow}`
                        }}>
                          <Icon size={22} />
                        </div>
                        <span style={{
                          fontSize: '0.675rem',
                          fontWeight: 700,
                          color: portal.color,
                          backgroundColor: `${portal.color}15`,
                          border: `1px solid ${portal.color}35`,
                          padding: '3px 10px',
                          borderRadius: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          {portal.badge}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                        {portal.title}
                      </h3>
                      <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.55, margin: 0 }}>
                        {portal.desc}
                      </p>
                    </div>

                    <Link
                      to="/login"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: portal.color,
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        marginTop: '22px',
                        padding: '6px 0',
                        transition: 'gap 0.15s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.gap = '10px';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.gap = '6px';
                      }}
                    >
                      <span>Access Station Portal</span>
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          4. Frosted Cosmic Footer
          -------------------------------------------------------------------- */}
      <footer style={{
        position: 'relative',
        zIndex: 2,
        borderTop: '1px solid rgba(56, 189, 248, 0.2)',
        backgroundColor: 'rgba(5, 10, 24, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '38px 24px 30px 24px'
      }}>
        <div style={{
          maxWidth: '1320px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 0 12px rgba(14, 165, 233, 0.4)'
            }}>
              <Wrench size={18} />
            </div>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
              EquipFix<span style={{ color: '#38bdf8' }}>AI</span>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '26px', fontSize: '0.84rem', color: '#94a3b8' }}>
            <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>Sign In</Link>
            <Link to="/register" style={{ color: '#94a3b8', textDecoration: 'none' }}>Create Account</Link>
            <Link to="/forgot-password" style={{ color: '#94a3b8', textDecoration: 'none' }}>Reset Password</Link>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            © {new Date().getFullYear()} EquipFixAI Autonomous Industrial Systems • ISO 13374 Condition Monitoring Compliant.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
