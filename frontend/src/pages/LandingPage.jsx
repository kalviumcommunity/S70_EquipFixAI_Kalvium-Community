import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import {
  Wrench, Shield, ArrowRight, Sparkles, HardHat,
  UserCheck, Factory, Zap, Activity, Cpu, CheckCircle2,
  Radio, Layers, Compass, ExternalLink, ShieldCheck,
  Package, FileText, Check, Clock, ChevronRight
} from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [plantStats, setPlantStats] = useState({
    total_machines: 8,
    running_machines: 8,
    active_incidents: 0,
    uptime_pct: '99.8%',
    total_work_orders: 0,
    active_work_orders: 0,
    total_employees: 6,
    loto_compliance_pct: '100%'
  });

  useEffect(() => {
    let isMounted = true;
    authApi.getStats()
      .then(res => {
        if (isMounted && res.data) {
          setPlantStats(res.data);
        }
      })
      .catch(err => console.error('Failed to load live landing stats:', err));
    return () => { isMounted = false; };
  }, []);

  const getRoleDestination = (roleId) => {
    if (roleId === 'OPERATOR') return '/labor/dashboard';
    if (roleId === 'TECHNICIAN') return '/technician/dashboard';
    if (roleId === 'SUPERVISOR') return '/supervisor/dashboard';
    if (roleId === 'MANAGER') return '/manager/dashboard';
    return '/dashboard';
  };

  const userRole = (user?.role?.name || user?.role || '').toUpperCase();

  const rolePortals = [
    {
      id: 'OPERATOR',
      title: 'Floor Operations & Triage',
      badge: 'Immediate Response',
      icon: HardHat,
      color: '#38bdf8',
      bgColor: 'rgba(56, 189, 248, 0.1)',
      borderColor: 'rgba(56, 189, 248, 0.3)',
      desc: 'Report machine faults with real-time photographic telemetry, trigger cell alerts, view OSHA LOTO procedures, and track immediate equipment operational states.'
    },
    {
      id: 'TECHNICIAN',
      title: 'Reliability & Diagnostics',
      badge: 'Deep RAG Diagnostics',
      icon: Wrench,
      color: '#34d399',
      bgColor: 'rgba(52, 211, 153, 0.1)',
      borderColor: 'rgba(52, 211, 153, 0.3)',
      desc: 'Access grounded OEM vector manuals, inspect CAD schematics, execute ISO Lockout/Tagout (LOTO) protocols, and document atomic spare parts usage.'
    },
    {
      id: 'SUPERVISOR',
      title: 'Mission Control & Supervision',
      badge: 'Shift Orchestration',
      icon: UserCheck,
      color: '#fbbf24',
      bgColor: 'rgba(251, 191, 36, 0.1)',
      borderColor: 'rgba(251, 191, 36, 0.3)',
      desc: 'Orchestrate technician work orders by skill matrix, monitor live cell harmonic anomalies, and authorize completed maintenance repair logs.'
    },
    {
      id: 'MANAGER',
      title: 'Executive Intelligence & Analytics',
      badge: 'Fleet Oversight',
      icon: Factory,
      color: '#38bdf8',
      bgColor: 'rgba(56, 189, 248, 0.1)',
      borderColor: 'rgba(56, 189, 248, 0.3)',
      desc: 'Plant-wide uptime tracking, MTBF & MTTR mathematical modeling, automated regulatory audit logs, and downloadable CSV report exports.'
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
      backgroundColor: '#070c1a',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* --------------------------------------------------------------------
          1. Industrial Dark Gradient & Ambient Glow Background
          -------------------------------------------------------------------- */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(2, 132, 199, 0.2), transparent 70%), radial-gradient(ellipse 50% 50% at 85% 90%, rgba(14, 165, 233, 0.12), transparent 60%), #070c1a',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Grid Pattern Overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
        zIndex: 1,
        pointerEvents: 'none'
      }} />

      {/* --------------------------------------------------------------------
          2. Frosted Enterprise Top Navigation
          -------------------------------------------------------------------- */}
      <header style={{
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        backgroundColor: 'rgba(7, 12, 26, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{
          maxWidth: '1360px',
          margin: '0 auto',
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          {/* Brand */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <img
              src="/logo.png"
              alt="EquipFix AI"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                objectFit: 'contain',
                boxShadow: '0 0 16px rgba(14, 165, 233, 0.4)'
              }}
            />
            <div>
              <div style={{
                fontSize: '1.35rem',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                EquipFix<span style={{ color: '#38bdf8' }}>AI</span>
                <span style={{
                  fontSize: '0.625rem',
                  fontWeight: 800,
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
                Industrial Fleet Reliability Platform
              </div>
            </div>
          </Link>
          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

            {user ? (
              <button
                onClick={() => navigate(getRoleDestination(userRole))}
                className="btn btn-primary"
                style={{
                  borderRadius: '8px',
                  padding: '9px 20px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  boxShadow: '0 0 18px rgba(14, 165, 233, 0.45)',
                  cursor: 'pointer'
                }}
              >
                Launch Workstation <ArrowRight size={16} />
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                >
                  Sign In
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
                    boxShadow: '0 0 18px rgba(14, 165, 233, 0.4)'
                  }}
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------------
          3. Hero Section & Intelligence Core
          -------------------------------------------------------------------- */}
      <section style={{
        position: 'relative',
        zIndex: 2,
        padding: '75px 24px 60px 24px',
        maxWidth: '1360px',
        margin: '0 auto',
        textAlign: 'center',
        flex: '1'
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          {/* Category Tagline Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '7px 20px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(11, 19, 41, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#38bdf8',
            marginBottom: '24px',
            letterSpacing: '0.06em',
            boxShadow: '0 0 20px rgba(14, 165, 233, 0.2)'
          }}>
            <Sparkles size={15} color="#38bdf8" />
            <span>REAL-TIME AI COPILOT • GROUNDED VECTOR RAG • ZERO DOWNTIME</span>
          </div>

          {/* Main Headline */}
          <h1 style={{
            fontSize: 'clamp(2.4rem, 5.2vw, 4.2rem)',
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            marginBottom: '22px'
          }}>
            Real-Time AI Diagnostics &amp; Intelligent{' '}
            <span style={{
              background: 'linear-gradient(135deg, #38bdf8 20%, #60a5fa 60%, #34d399 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 25px rgba(56, 189, 248, 0.35))'
            }}>
              Industrial Equipment Maintenance
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(1.05rem, 1.8vw, 1.25rem)',
            color: '#cbd5e1',
            lineHeight: 1.65,
            maxWidth: '820px',
            margin: '0 auto 40px auto'
          }}>
            Powered by multi-source RAG across official OEM manuals, live machine telemetry, OSHA 1910.147 Lockout/Tagout verification, and verified technician dispatch across production lines.
          </p>

          {/* Call-to-Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '50px' }}>
            <Link
              to={user ? getRoleDestination(userRole) : "/login"}
              className="btn btn-primary btn-lg"
              style={{
                borderRadius: '10px',
                padding: '14px 34px',
                fontSize: '1rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                border: '1px solid rgba(56, 189, 248, 0.5)',
                boxShadow: '0 0 25px rgba(14, 165, 233, 0.45)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 0 35px rgba(14, 165, 233, 0.65)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 0 25px rgba(14, 165, 233, 0.45)';
              }}
            >
              <span>{user ? `Launch ${userRole} Workstation` : 'Launch Operations Console'}</span>
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/documents"
              style={{
                borderRadius: '10px',
                padding: '14px 30px',
                fontSize: '1rem',
                fontWeight: 600,
                backgroundColor: 'rgba(11, 19, 41, 0.75)',
                backdropFilter: 'blur(12px)',
                color: '#e2e8f0',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.2s ease'
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
              <Compass size={18} color="#38bdf8" />
              <span>Browse OEM Schematics &amp; Manuals</span>
            </Link>
          </div>

          {/* ------------------------------------------------------------------
              Live Operational Telemetry Strip (Frosted Glass KPI Cards)
              ------------------------------------------------------------------ */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            marginBottom: '60px'
          }}>
            <div style={{
              backgroundColor: 'rgba(11, 19, 41, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '14px',
              padding: '18px 20px',
              textAlign: 'left',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Connected Fleet
                </span>
                <Cpu size={16} color="#38bdf8" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.02em' }}>
                {plantStats.total_machines} Units
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '4px' }}>
                {plantStats.running_machines || plantStats.total_machines} active units in nominal operation
              </div>
            </div>

            <div style={{
              backgroundColor: 'rgba(11, 19, 41, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(52, 211, 153, 0.25)',
              borderRadius: '14px',
              padding: '18px 20px',
              textAlign: 'left',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Fleet Availability
                </span>
                <Activity size={16} color="#34d399" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#34d399', letterSpacing: '-0.02em' }}>
                {plantStats.uptime_pct || '99.8%'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '4px' }}>
                Real-time operational availability score
              </div>
            </div>

            <div style={{
              backgroundColor: 'rgba(11, 19, 41, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(251, 191, 36, 0.25)',
              borderRadius: '14px',
              padding: '18px 20px',
              textAlign: 'left',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Active Plant Alerts
                </span>
                <Radio size={16} color="#fbbf24" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#fbbf24', letterSpacing: '-0.02em' }}>
                {plantStats.active_incidents} Active
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '4px' }}>
                Live floor incidents &amp; alarms logged
              </div>
            </div>

            <div style={{
              backgroundColor: 'rgba(11, 19, 41, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '14px',
              padding: '18px 20px',
              textAlign: 'left',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Safety Protocol
                </span>
                <ShieldCheck size={16} color="#38bdf8" />
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.02em' }}>
                {plantStats.loto_compliance_pct || '100%'} LOTO
              </div>
              <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '4px' }}>
                Strict zero-energy isolation enforced
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------
              Live Operational Pipeline Display (4-Phase Architecture)
              ------------------------------------------------------------------ */}
          <div style={{
            backgroundColor: 'rgba(11, 19, 41, 0.85)',
            backdropFilter: 'blur(18px)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '18px',
            padding: '24px',
            marginBottom: '65px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)'
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
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
                backgroundColor: '#070c18',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '10px',
                padding: '16px 14px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', marginBottom: '4px' }}>PHASE 1</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>Telemetry Trigger</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Harmonics &amp; floor incident triage</div>
              </div>

              <div style={{
                backgroundColor: '#070c18',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '10px',
                padding: '16px 14px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8', marginBottom: '4px' }}>PHASE 2</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>Supervisor Dispatch</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>Skill-based technician work orders</div>
              </div>

              <div style={{
                backgroundColor: 'rgba(14, 165, 233, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.5)',
                borderRadius: '10px',
                padding: '16px 14px',
                textAlign: 'center',
                boxShadow: '0 0 15px rgba(14, 165, 233, 0.25)'
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38bdf8', marginBottom: '4px' }}>PHASE 3</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#38bdf8' }}>AI RAG Diagnostics</div>
                <div style={{ fontSize: '0.75rem', color: '#bae6fd', marginTop: '4px' }}>Real-time Gemini streaming &amp; OEM manuals</div>
              </div>

              <div style={{
                backgroundColor: '#070c18',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: '10px',
                padding: '16px 14px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#10b981', marginBottom: '4px' }}>PHASE 4</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>Mission Clearance</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>OSHA 1910.147 sign-off &amp; parts balance</div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------
              Role Portals Grid (Workstation Portals)
              ------------------------------------------------------------------ */}
          <div style={{ textAlign: 'left', marginBottom: '60px' }}>
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#38bdf8',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '20px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <Compass size={18} />
              <span>Select Your Operational Role Workstation</span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              {rolePortals.map((portal) => {
                const Icon = portal.icon;
                return (
                  <div
                    key={portal.id}
                    style={{
                      backgroundColor: '#0b1329',
                      border: `1px solid ${portal.borderColor}`,
                      borderRadius: '16px',
                      padding: '24px 22px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      position: 'relative',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.borderColor = portal.color;
                      e.currentTarget.style.boxShadow = `0 12px 30px rgba(0, 0, 0, 0.5), 0 0 20px ${portal.bgColor}`;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = portal.borderColor;
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          backgroundColor: portal.bgColor,
                          border: `1px solid ${portal.borderColor}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: portal.color
                        }}>
                          <Icon size={22} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {user && (userRole === portal.id || (userRole === 'LABOR' && portal.id === 'OPERATOR')) && (
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              color: '#10b981',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              padding: '2px 8px',
                              borderRadius: '8px',
                              letterSpacing: '0.04em'
                            }}>
                              ACTIVE CLEARANCE
                            </span>
                          )}
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: portal.color,
                            backgroundColor: portal.bgColor,
                            border: `1px solid ${portal.borderColor}`,
                            padding: '3px 10px',
                            borderRadius: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                          }}>
                            {portal.badge}
                          </span>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                        {portal.title}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.55, margin: 0 }}>
                        {portal.desc}
                      </p>
                    </div>

                    <Link
                      to={user ? getRoleDestination(portal.id) : '/login'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: portal.color,
                        fontSize: '0.86rem',
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
                      <span>{user ? `Launch ${portal.id.charAt(0) + portal.id.slice(1).toLowerCase()} Console` : 'Access Role Workstation'}</span>
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ------------------------------------------------------------------
              Enterprise Platform Feature Highlights
              ------------------------------------------------------------------ */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '60px'
          }}>
            <div style={{
              backgroundColor: '#0b1329',
              border: '1px solid #1e3a8a',
              borderRadius: '14px',
              padding: '22px',
              textAlign: 'left'
            }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(14, 165, 233, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', color: '#38bdf8' }}>
                <Sparkles size={20} />
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0' }}>
                Real-Time Gemini AI Copilot
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.55, margin: 0 }}>
                Streaming reasoning with Google Gemini models (Gemini 2.0 Flash, Flash-Lite, 1.5 Pro). Source-grounded diagnostic citations from uploaded plant manuals.
              </p>
            </div>

            <div style={{
              backgroundColor: '#0b1329',
              border: '1px solid #1e3a8a',
              borderRadius: '14px',
              padding: '22px',
              textAlign: 'left'
            }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', color: '#38bdf8' }}>
                <Compass size={20} />
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0' }}>
                OEM CAD Schematics &amp; Blueprints
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.55, margin: 0 }}>
                Zoomable assembly schematics, 480V single-line diagrams, hydraulic manifolds, and interactive component callouts with torque and part numbers.
              </p>
            </div>

            <div style={{
              backgroundColor: '#0b1329',
              border: '1px solid #166534',
              borderRadius: '14px',
              padding: '22px',
              textAlign: 'left'
            }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', color: '#34d399' }}>
                <ShieldCheck size={20} />
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0' }}>
                OSHA 1910.147 LOTO Verification
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.55, margin: 0 }}>
                Mandatory 7-step zero-energy isolation checklists, NFPA 70E 3-point voltage tests, digital sign-off certification, and printable audit certificates.
              </p>
            </div>

            <div style={{
              backgroundColor: '#0b1329',
              border: '1px solid #1e3a8a',
              borderRadius: '14px',
              padding: '22px',
              textAlign: 'left'
            }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(249, 115, 22, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', color: '#fb923c' }}>
                <Package size={20} />
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0' }}>
                Predictive Parts &amp; Inventory
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.55, margin: 0 }}>
                Atomic spare parts reservation, minimum restock thresholds, historical repair cost accounting, and work order part usage logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------
          4. Frosted Enterprise Footer
          -------------------------------------------------------------------- */}
      <footer style={{
        position: 'relative',
        zIndex: 2,
        borderTop: '1px solid rgba(56, 189, 248, 0.2)',
        backgroundColor: '#070c18',
        padding: '36px 24px 28px 24px'
      }}>
        <div style={{
          maxWidth: '1360px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/logo.png"
              alt="EquipFix AI"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                objectFit: 'contain',
                boxShadow: '0 0 12px rgba(14, 165, 233, 0.3)'
              }}
            />
            <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff' }}>
              EquipFix<span style={{ color: '#38bdf8' }}>AI</span>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '24px', fontSize: '0.84rem', color: '#94a3b8' }}>
            <Link to="/documents" style={{ color: '#94a3b8', textDecoration: 'none' }}>Technical Manuals</Link>
            <Link to="/documents?type=SAFETY" style={{ color: '#94a3b8', textDecoration: 'none' }}>OSHA LOTO Standards</Link>
            <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>Sign In</Link>
            <Link to="/register" style={{ color: '#94a3b8', textDecoration: 'none' }}>Create Account</Link>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
            © {new Date().getFullYear()} EquipFixAI Industrial Systems • ISO 13374 Condition Monitoring &amp; OSHA 29 CFR 1910.147 Compliant.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
