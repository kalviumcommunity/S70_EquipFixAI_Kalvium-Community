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
  ChevronRight, ArrowUpRight, Pin, MessageSquare, Plus, Trash2
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

  // Recent Chats for AI Copilot (Persisted in localStorage with real plant machines)
  const INITIAL_CHATS = [
    {
      id: 'chat-cnc04',
      title: 'CNC-04 — Spindle Vibration',
      subtitle: 'Excessive 7mm/s vibration check',
      time: 'Today 10:24 AM',
      pinned: true,
      machineCode: 'CNC-04'
    },
    {
      id: 'chat-cnc03',
      title: 'CNC-03 — Coolant Pressure Spikes',
      subtitle: 'Flow drops below 15 LPM threshold',
      time: 'Yesterday',
      pinned: false,
      machineCode: 'CNC-03'
    },
    {
      id: 'chat-press01',
      title: 'PRESS-01 — Hydraulic Press Diagnostic',
      subtitle: 'Stamping cylinder pressure relief',
      time: 'Sep 28',
      pinned: false,
      machineCode: 'PRESS-01'
    },
    {
      id: 'chat-mill01',
      title: 'MILL-01 — Drive Belt Slippage',
      subtitle: 'Quill feed tension check',
      time: 'Sep 24',
      pinned: false,
      machineCode: 'MILL-01'
    },
    {
      id: 'chat-robot01',
      title: 'ROBOT-01 — Welder Arm Calibration',
      subtitle: 'Articulated arm joint tolerance',
      time: 'Sep 22',
      pinned: false,
      machineCode: 'ROBOT-01'
    }
  ];

  const [recentChats, setRecentChats] = useState(() => {
    try {
      const saved = localStorage.getItem('equipfix_recent_chats');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return INITIAL_CHATS;
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    return localStorage.getItem('equipfix_active_chat_id') || 'chat-cnc04';
  });

  // Sync recent chats to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('equipfix_recent_chats', JSON.stringify(recentChats));
    } catch (_) {}
  }, [recentChats]);

  // Listen to external chat events
  useEffect(() => {
    const handleExternalSelect = (e) => {
      if (e.detail?.id) {
        setActiveChatId(e.detail.id);
        localStorage.setItem('equipfix_active_chat_id', e.detail.id);
      }
    };

    const handleExternalNew = (e) => {
      if (e.detail?.id) {
        setActiveChatId(e.detail.id);
        localStorage.setItem('equipfix_active_chat_id', e.detail.id);
        setRecentChats((prev) => {
          if (prev.some((c) => c.id === e.detail.id)) return prev;
          return [e.detail, ...prev];
        });
      }
    };

    const handleExternalUpdate = (e) => {
      if (e.detail?.id) {
        setRecentChats((prev) =>
          prev.map((c) => (c.id === e.detail.id ? { ...c, ...e.detail } : c))
        );
      }
    };

    window.addEventListener('equipfix:select-chat', handleExternalSelect);
    window.addEventListener('equipfix:new-chat', handleExternalNew);
    window.addEventListener('equipfix:update-chats', handleExternalUpdate);
    return () => {
      window.removeEventListener('equipfix:select-chat', handleExternalSelect);
      window.removeEventListener('equipfix:new-chat', handleExternalNew);
      window.removeEventListener('equipfix:update-chats', handleExternalUpdate);
    };
  }, []);

  const handleCreateNewChat = () => {
    const newId = `chat-${Date.now()}`;
    const newChat = {
      id: newId,
      title: 'New AI Troubleshooting',
      subtitle: 'Ready for equipment query',
      time: 'Just now',
      pinned: false,
      machineCode: 'CNC-04'
    };
    const updated = [newChat, ...recentChats];
    setRecentChats(updated);
    setActiveChatId(newId);
    localStorage.setItem('equipfix_recent_chats', JSON.stringify(updated));
    localStorage.setItem('equipfix_active_chat_id', newId);
    navigate('/ai-assistant');
    window.dispatchEvent(new CustomEvent('equipfix:new-chat', { detail: newChat }));
    onClose();
  };

  const handleTogglePin = (id, e) => {
    e.stopPropagation();
    setRecentChats((prev) => {
      const updated = prev.map((c) =>
        c.id === id ? { ...c, pinned: !c.pinned } : c
      );
      localStorage.setItem('equipfix_recent_chats', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteChat = (id, e) => {
    e.stopPropagation();
    setRecentChats((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      localStorage.setItem('equipfix_recent_chats', JSON.stringify(updated));
      localStorage.removeItem(`equipfix_chat_messages_${id}`);
      if (activeChatId === id) {
        if (updated.length > 0) {
          const nextChat = updated[0];
          setActiveChatId(nextChat.id);
          localStorage.setItem('equipfix_active_chat_id', nextChat.id);
          window.dispatchEvent(new CustomEvent('equipfix:select-chat', { detail: nextChat }));
        } else {
          setTimeout(() => handleCreateNewChat(), 50);
        }
      }
      return updated;
    });
  };

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
    const interval = setInterval(() => {
      fetchLiveCounts();
    }, 12000);

    const handleExternalUpdate = () => fetchLiveCounts();
    window.addEventListener('equipfix:notifications-updated', handleExternalUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('equipfix:notifications-updated', handleExternalUpdate);
    };
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
            </>
          )}

          {/* ==================== 4. OPERATOR / LABOR NAVIGATION ==================== */}
          {role === 'OPERATOR' && (
            <>
              <div style={sectionHeaderStyle}>Operator Floor</div>
              <NavLink to="/labor/dashboard" end style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <LayoutDashboard size={17} />
                  <span>Floor Workstation</span>
                </div>
              </NavLink>
              <NavLink to="/labor/dashboard#reports" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <History size={17} color="#38bdf8" />
                  <span>My Incident Tracking</span>
                </div>
                {counts.activeIncidents > 0 && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    padding: '2px 6px',
                    borderRadius: '9999px',
                  }}>
                    {counts.activeIncidents}
                  </span>
                )}
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
                  <span>Equipment Fleet</span>
                </div>
              </NavLink>
              <NavLink to="/labor/dashboard#ai-copilot" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sparkles size={17} color="#a855f7" />
                  <span style={{ color: '#c084fc', fontWeight: 600 }}>AI Copilot & Safety</span>
                </div>
              </NavLink>
              <NavLink to="/documents" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={17} color="#10b981" />
                  <span>Safety SOPs & Manuals</span>
                </div>
              </NavLink>
              <NavLink to="/notifications" style={navItemStyle} onClick={onClose}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bell size={17} />
                  <span>Notifications</span>
                </div>
                {counts.unreadNotifs > 0 && (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    padding: '2px 6px',
                    borderRadius: '9999px',
                  }}>
                    {counts.unreadNotifs}
                  </span>
                )}
              </NavLink>
            </>
          )}

          {/* ==================== RECENT CHATS (MATCHING REFERENCE DESIGN) ==================== */}
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(30, 41, 59, 0.7)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 6px 8px 6px'
            }}>
              <span style={{
                fontSize: '0.67rem',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.07em'
              }}>
                Recent Chats
              </span>
              <button
                type="button"
                onClick={handleCreateNewChat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.2)'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.1)'; }}
                title="Start a new troubleshooting session"
              >
                <Plus size={11} />
                <span>New Chat</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {[...recentChats]
                .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
                .map((c) => {
                  const isSelected = activeChatId === c.id && location.pathname.includes('/ai-assistant');
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setActiveChatId(c.id);
                        localStorage.setItem('equipfix_active_chat_id', c.id);
                        navigate('/ai-assistant');
                        window.dispatchEvent(new CustomEvent('equipfix:select-chat', { detail: c }));
                        onClose();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.18)' : 'transparent',
                        borderLeft: isSelected ? '3px solid #38bdf8' : '3px solid transparent',
                        border: isSelected ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                        transition: 'all 0.15s ease',
                        position: 'relative'
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        backgroundColor: isSelected ? '#2563eb' : 'rgba(30, 41, 59, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: isSelected ? '#ffffff' : '#94a3b8'
                      }}>
                        <Wrench size={13} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? '#ffffff' : '#e2e8f0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {c.title}
                        </div>
                        <div style={{
                          fontSize: '0.67rem',
                          color: '#94a3b8',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: '1px'
                        }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '6px' }}>
                            {c.subtitle}
                          </span>
                          <span style={{ fontSize: '0.62rem', color: '#64748b', flexShrink: 0 }}>{c.time}</span>
                        </div>
                      </div>

                      {/* Action buttons: Pin & Delete */}
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(c.id, e)}
                          title={c.pinned ? "Unpin chat" : "Pin chat to top"}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '3px',
                            color: c.pinned ? '#38bdf8' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: c.pinned ? 1 : 0.6,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.opacity = '1'; }}
                          onMouseOut={(e) => { if (!c.pinned) { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.opacity = '0.6'; } }}
                        >
                          <Pin size={12} style={{ transform: c.pinned ? 'rotate(-25deg)' : 'none' }} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteChat(c.id, e)}
                          title="Delete chat thread"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '3px',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 0.6,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.opacity = '1'; }}
                          onMouseOut={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.opacity = '0.6'; }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
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
