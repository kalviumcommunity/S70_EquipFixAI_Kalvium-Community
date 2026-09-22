import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { incidentsApi, partsApi, notificationsApi } from '../../services/api';
import {
  LayoutDashboard, Cpu, AlertTriangle, ClipboardList,
  Wrench, Calendar, Package, FileText, ShieldAlert, Users,
  Sparkles, ShieldCheck, BarChart3, FileSpreadsheet, Bell,
  Settings, CheckSquare, PlusCircle, History, X, Phone,
  ChevronRight, ArrowUpRight
} from 'lucide-react';

export const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { user } = useAuth();
  const { lastEvent } = useWebSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const role = user?.role?.name?.toUpperCase() || 'OPERATOR';

  // Live badge counts
  const [counts, setCounts] = useState({
    activeIncidents: 0,
    lowStockParts: 0,
    unreadNotifs: 0,
  });

  const fetchLiveCounts = async () => {
    try {
      const [incRes, partsRes, notifRes] = await Promise.allSettled([
        incidentsApi.list(),
        partsApi.list({ low_stock_only: true }),
        notificationsApi.list(),
      ]);

      let activeInc = 0;
      if (incRes.status === 'fulfilled' && Array.isArray(incRes.value.data)) {
        activeInc = incRes.value.data.filter(
          (i) => !['RESOLVED', 'APPROVED', 'CLOSED', 'CANCELLED'].includes(i.status)
        ).length;
      }

      let lowParts = 0;
      if (partsRes.status === 'fulfilled' && Array.isArray(partsRes.value.data)) {
        lowParts = partsRes.value.data.length;
      }

      let unread = 0;
      if (notifRes.status === 'fulfilled' && Array.isArray(notifRes.value.data)) {
        unread = notifRes.value.data.filter((n) => !n.is_read).length;
      }

      setCounts({
        activeIncidents: activeInc,
        lowStockParts: lowParts,
        unreadNotifs: unread,
      });
    } catch (err) {
      console.error('Sidebar count fetch error:', err);
    }
  };

  useEffect(() => {
    fetchLiveCounts();
  }, [lastEvent]);

  const navItemStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '9px 12px',
    borderRadius: '8px',
    fontSize: '0.825rem',
    fontWeight: isActive ? '600' : '500',
    color: isActive ? '#ffffff' : '#94a3b8',
    backgroundColor: isActive ? 'rgba(37, 99, 235, 0.18)' : 'transparent',
    textDecoration: 'none',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    marginBottom: '3px',
    borderLeft: isActive ? '3px solid #38bdf8' : '3px solid transparent',
    boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.15)' : 'none',
  });

  const sectionHeaderStyle = {
    fontSize: '0.67rem',
    textTransform: 'uppercase',
    color: '#475569',
    fontWeight: 700,
    letterSpacing: '0.07em',
    padding: '14px 10px 6px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(7, 12, 24, 0.8)',
            backdropFilter: 'blur(4px)',
            zIndex: 90,
            display: 'block',
          }}
        />
      )}

      <aside
        style={{
          width: '265px',
          backgroundColor: '#090f1f',
          backgroundImage: 'linear-gradient(180deg, #0b1426 0%, #080d1a 100%)',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #1e293b',
          height: '100vh',
          flexShrink: 0,
          zIndex: 95,
          transition: 'transform 0.25s ease',
          position: 'relative',
        }}
        className={`app-sidebar ${isOpen ? 'open' : ''}`}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '18px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(30, 41, 59, 0.8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0 0 16px rgba(37, 99, 235, 0.45)',
              }}
            >
              <Wrench size={19} />
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                EquipFix<span style={{ color: '#38bdf8' }}>AI</span>
              </div>
              <div
                style={{
                  fontSize: '0.65rem',
                  color: '#38bdf8',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {role} COMMAND
              </div>
            </div>
          </div>

          {/* Close for mobile */}
          <button
            type="button"
            onClick={onClose}
            className="sidebar-close-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'none',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links according to Role */}
        <nav
          style={{
            padding: '12px 10px',
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* ==================== 1. MANAGER NAVIGATION ==================== */}
          {role === 'MANAGER' && (
            <>
              {/* SECTION: COMMAND */}
              <div style={sectionHeaderStyle}>Overview</div>
              <NavLink to="/manager/dashboard" end style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <LayoutDashboard size={17} color="#38bdf8" />
                  <span>Executive Dashboard</span>
                </div>
              </NavLink>

              {/* SECTION: SHOP FLOOR */}
              <div style={sectionHeaderStyle}>Shop Floor Operations</div>
              <NavLink to="/machines" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Cpu size={17} color="#60a5fa" />
                  <span>Equipment Fleet</span>
                </div>
              </NavLink>

              <NavLink to="/incidents" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle size={17} color="#f59e0b" />
                  <span>Active Incidents</span>
                </div>
                {counts.activeIncidents > 0 && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      padding: '2px 7px',
                      borderRadius: '10px',
                      boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)',
                    }}
                  >
                    {counts.activeIncidents}
                  </span>
                )}
              </NavLink>

              <NavLink to="/work-orders" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ClipboardList size={17} color="#a78bfa" />
                  <span>Work Orders</span>
                </div>
              </NavLink>

              <NavLink to="/maintenance" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Wrench size={17} color="#34d399" />
                  <span>Maintenance Logs</span>
                </div>
              </NavLink>

              {/* SECTION: RESOURCES */}
              <div style={sectionHeaderStyle}>Plant Inventory & Team</div>
              <NavLink to="/parts" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Package size={17} color="#f97316" />
                  <span>Spare Parts Inventory</span>
                </div>
                {counts.lowStockParts > 0 && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      backgroundColor: 'rgba(239, 68, 68, 0.18)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      padding: '1px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    {counts.lowStockParts} low
                  </span>
                )}
              </NavLink>

              <NavLink to="/users" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={17} color="#38bdf8" />
                  <span>Employee Directory</span>
                </div>
              </NavLink>

              {/* SECTION: INTELLIGENCE & COMPLIANCE */}
              <div style={sectionHeaderStyle}>Intelligence & Compliance</div>
              <NavLink to="/ai-assistant" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sparkles size={17} color="#38bdf8" />
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>AI Copilot</span>
                </div>
              </NavLink>

              <NavLink
                to="/manager/dashboard#analytics"
                style={navItemStyle}
                onClick={() => {
                  onClose();
                  if (location.pathname === '/manager/dashboard') {
                    window.location.hash = 'analytics';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <BarChart3 size={17} color="#a855f7" />
                  <span>Deep Analytics</span>
                </div>
              </NavLink>

              <NavLink
                to="/manager/dashboard#reports"
                style={navItemStyle}
                onClick={() => {
                  onClose();
                  if (location.pathname === '/manager/dashboard') {
                    window.location.hash = 'reports';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileSpreadsheet size={17} color="#10b981" />
                  <span>Export Reports</span>
                </div>
              </NavLink>

              <NavLink to="/documents" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={17} color="#94a3b8" />
                  <span>Technical Manuals</span>
                </div>
              </NavLink>

              <NavLink to="/documents?type=SAFETY" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={17} color="#22c55e" />
                  <span>Safety & OSHA LOTO</span>
                </div>
              </NavLink>

              {/* SECTION: ADMINISTRATION */}
              <div style={sectionHeaderStyle}>System & Audit</div>
              <NavLink to="/audit-logs" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldAlert size={17} color="#eab308" />
                  <span>Audit Trail</span>
                </div>
              </NavLink>

              <NavLink to="/notifications" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bell size={17} color="#cbd5e1" />
                  <span>Notifications</span>
                </div>
                {counts.unreadNotifs > 0 && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      padding: '2px 7px',
                      borderRadius: '10px',
                    }}
                  >
                    {counts.unreadNotifs}
                  </span>
                )}
              </NavLink>

              <NavLink to="/settings" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Settings size={17} color="#94a3b8" />
                  <span>System Settings</span>
                </div>
              </NavLink>
            </>
          )}

          {/* ==================== 2. SUPERVISOR NAVIGATION ==================== */}
          {role === 'SUPERVISOR' && (
            <>
              <div style={sectionHeaderStyle}>Supervisor Operations</div>
              <NavLink to="/supervisor/dashboard" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <LayoutDashboard size={17} />
                  <span>Dashboard</span>
                </div>
              </NavLink>
              <NavLink to="/incidents" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle size={17} color="#f59e0b" />
                  <span>Incidents</span>
                </div>
              </NavLink>
              <NavLink to="/work-orders" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ClipboardList size={17} color="#a78bfa" />
                  <span>Work Orders</span>
                </div>
              </NavLink>
              <NavLink to="/maintenance" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckSquare size={17} color="#10b981" />
                  <span>Maintenance Approvals</span>
                </div>
              </NavLink>
              <NavLink to="/schedules" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={17} color="#38bdf8" />
                  <span>PM Schedules</span>
                </div>
              </NavLink>
              <NavLink to="/machines" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Cpu size={17} color="#60a5fa" />
                  <span>Equipment</span>
                </div>
              </NavLink>
              <NavLink to="/notifications" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bell size={17} />
                  <span>Notifications</span>
                </div>
              </NavLink>
            </>
          )}

          {/* ==================== 3. TECHNICIAN NAVIGATION ==================== */}
          {role === 'TECHNICIAN' && (
            <>
              <div style={sectionHeaderStyle}>Technician Workspace</div>
              <NavLink to="/technician/dashboard" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <LayoutDashboard size={17} />
                  <span>Dashboard</span>
                </div>
              </NavLink>
              <NavLink to="/work-orders" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ClipboardList size={17} color="#a78bfa" />
                  <span>My Work Orders</span>
                </div>
              </NavLink>
              <NavLink to="/ai-assistant" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sparkles size={17} color="#38bdf8" />
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>AI Copilot</span>
                </div>
              </NavLink>
              <NavLink to="/machines" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Cpu size={17} color="#60a5fa" />
                  <span>Equipment Fleet</span>
                </div>
              </NavLink>
              <NavLink to="/parts" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Package size={17} color="#f97316" />
                  <span>Parts Stock</span>
                </div>
              </NavLink>
              <NavLink to="/notifications" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bell size={17} />
                  <span>Notifications</span>
                </div>
              </NavLink>
            </>
          )}

          {/* ==================== 4. OPERATOR / LABOR NAVIGATION ==================== */}
          {role === 'OPERATOR' && (
            <>
              <div style={sectionHeaderStyle}>Operator Floor</div>
              <NavLink to="/labor/dashboard" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <LayoutDashboard size={17} />
                  <span>Floor Dashboard</span>
                </div>
              </NavLink>
              <NavLink to="/incidents" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <PlusCircle size={17} color="#38bdf8" />
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>Report Machine Issue</span>
                </div>
              </NavLink>
              <NavLink to="/machines" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Cpu size={17} color="#60a5fa" />
                  <span>Equipment Status</span>
                </div>
              </NavLink>
              <NavLink to="/notifications" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bell size={17} />
                  <span>Notifications</span>
                </div>
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer Profile Status Badge */}
        <div
          style={{
            padding: '12px 14px',
            borderTop: '1px solid rgba(30, 41, 59, 0.8)',
            backgroundColor: 'rgba(11, 19, 38, 0.6)',
          }}
        >
          <div
            onClick={() => navigate('/settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              transition: 'background 0.15s ease',
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.5)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#1e293b',
                  border: '1px solid #3b82f6',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {user?.full_name ? user.full_name[0] : 'U'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#f8fafc',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.full_name}
                </div>
                <div
                  style={{
                    fontSize: '0.68rem',
                    color: user?.phone ? '#34d399' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily: user?.phone ? 'var(--font-mono)' : 'inherit',
                  }}
                >
                  <Phone size={10} />
                  <span>{user?.phone || 'No phone set'}</span>
                </div>
              </div>
            </div>
            <ArrowUpRight size={14} color="#64748b" />
          </div>
        </div>
      </aside>
    </>
  );
};
