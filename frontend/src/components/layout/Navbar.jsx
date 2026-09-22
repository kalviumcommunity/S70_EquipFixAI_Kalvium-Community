import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { notificationsApi, searchApi } from '../../services/api';
import AICopilotModal from '../ai/AICopilotModal';
import { LogoutConfirmModal } from '../auth/LogoutConfirmModal';
import ProfileImageModal from '../common/ProfileImageModal';
import {
  Bell, LogOut, Wifi, WifiOff, Search, Cpu, AlertTriangle,
  FileText, Wrench, Package, Users, X, ArrowRight, CheckCheck,
  Menu, ChevronRight, Sparkles, Bot, ChevronDown, UserCheck, HardHat, Factory,
  Settings, ShieldCheck, ZoomIn
} from 'lucide-react';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { connected, lastEvent } = useWebSocket();
  const navigate = useNavigate();
  const location = useLocation();

  // Logout Confirmation Modal State
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Profile Image Modal (Clearly visible on screen)
  const [showProfilePhotoModal, setShowProfilePhotoModal] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState('ALL');

  // AI Copilot Modal State
  const [showCopilotModal, setShowCopilotModal] = useState(false);

  // User Profile Dropdown State
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);




  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const searchDebounceRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Keyboard shortcut Ctrl+K / Cmd+K to launch AI Copilot
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setShowCopilotModal((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsApi.list();
      setNotifications(res.data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, lastEvent]);

  // Handle Search Input Change
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults(null);
      return;
    }

    setShowSearchModal(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchApi.search(val);
        setSearchResults(res.data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 250);
  };

  // Close search and profile menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchModal(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkOneRead = async (id, notif) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      // Navigate to relevant entity if applicable
      if (notif.related_entity_type === 'incident') {
        navigate('/incidents');
      } else if (notif.related_entity_type === 'work_order') {
        navigate('/work-orders');
      } else if (notif.related_entity_type === 'maintenance_record') {
        navigate('/maintenance');
      } else if (notif.related_entity_type === 'part') {
        navigate('/parts');
      }
      setShowDropdown(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter notifications by tab
  const filteredNotifications = notifications.filter((n) => {
    if (activeNotifTab === 'UNREAD') return !n.is_read;
    if (activeNotifTab === 'APPROVALS') return n.notification_type === 'APPROVAL';
    if (activeNotifTab === 'ALERTS') return ['ALERT', 'LOW_STOCK'].includes(n.notification_type);
    return true;
  });

  const handleSearchResultClick = (url) => {
    setShowSearchModal(false);
    setSearchQuery('');
    navigate(url);
  };

  return (
    <header style={{
      height: '60px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      position: 'relative',
      zIndex: 50
    }}>
      {/* Left: Hamburger & Plant breadcrumb / status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="navbar-menu-btn"
            style={{
              background: 'none',
              border: 'none',
              color: '#475569',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Menu size={20} />
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <span style={{ color: '#64748b', fontWeight: 500 }}>Operations</span>
          <ChevronRight size={14} color="#94a3b8" />
          <span style={{ fontWeight: 700, color: '#0f172a' }}>
            {location.pathname.includes('/manager/dashboard') ? 'Manager Dashboard' :
             location.pathname.includes('/supervisor/dashboard') ? 'Supervisor Dashboard' :
             location.pathname.includes('/technician/dashboard') ? 'Technician Workspace' :
             location.pathname.includes('/labor/dashboard') || location.pathname.includes('/operator/dashboard') ? 'Labor Portal' :
             location.pathname.includes('/machines') ? 'Equipment Fleet' :
             location.pathname.includes('/incidents') ? 'Incidents' :
             location.pathname.includes('/work-orders') ? 'Work Orders' :
             location.pathname.includes('/maintenance') ? 'Maintenance' :
             location.pathname.includes('/schedules') ? 'Preventive Schedules' :
             location.pathname.includes('/parts') ? 'Spare Parts Inventory' :
             location.pathname.includes('/documents') ? 'Manuals & SOPs' :
             location.pathname.includes('/ai-assistant') ? 'AI Maintenance Copilot' :
             location.pathname.includes('/audit-logs') ? 'Audit Trail' :
             location.pathname.includes('/users') ? 'Employee Directory' :
             location.pathname.includes('/notifications') ? 'Notifications' :
             location.pathname.includes('/settings') ? 'Settings' : 'Overview'}
          </span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.725rem',
          padding: '2px 8px',
          borderRadius: '9999px',
          backgroundColor: connected ? '#ecfdf5' : '#fef2f2',
          color: connected ? '#065f46' : '#991b1b',
          border: `1px solid ${connected ? '#a7f3d0' : '#fecaca'}`,
          fontWeight: 600
        }}>
          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{connected ? 'LIVE' : 'RECONNECTING'}</span>
        </div>
      </div>


      {/* Center: Global Search Bar */}
      <div ref={searchContainerRef} style={{ position: 'relative', width: '380px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#f1f5f9',
          borderRadius: '8px',
          padding: '6px 12px',
          border: showSearchModal ? '1px solid #3b82f6' : '1px solid transparent',
          transition: 'all 0.15s ease'
        }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Global search machines, incidents, parts, SOPs..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => { if (searchQuery.trim()) setShowSearchModal(true); }}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '0.825rem',
              color: '#1e293b'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults(null); setShowSearchModal(false); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              <X size={14} color="#94a3b8" />
            </button>
          )}
        </div>

        {/* Search Results Popover */}
        {showSearchModal && searchResults && (
          <div style={{
            position: 'absolute',
            top: '42px',
            left: 0,
            right: 0,
            maxHeight: '420px',
            overflowY: 'auto',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
            border: '1px solid #e2e8f0',
            padding: '12px',
            zIndex: 110
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>
              Matches for "{searchResults.query}" ({searchResults.total_matches} found)
            </div>

            {searchResults.total_matches === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.825rem' }}>
                No records found matching "{searchResults.query}".
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Machines */}
                {searchResults.results.machines?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Machines & Equipment
                    </div>
                    {searchResults.results.machines.map((m) => (
                      <div
                        key={`m-${m.id}`}
                        onClick={() => handleSearchResultClick(m.url)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: '#f8fafc',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Cpu size={14} color="#2563eb" />
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>{m.title}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{m.subtitle}</div>
                          </div>
                        </div>
                        <span className={`badge badge-${m.status.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Incidents */}
                {searchResults.results.incidents?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Incidents
                    </div>
                    {searchResults.results.incidents.map((inc) => (
                      <div
                        key={`inc-${inc.id}`}
                        onClick={() => handleSearchResultClick(inc.url)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: '#f8fafc',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertTriangle size={14} color="#dc2626" />
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>{inc.title}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{inc.subtitle}</div>
                          </div>
                        </div>
                        <span className={`badge badge-${inc.status.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                          {inc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Spare Parts */}
                {searchResults.results.parts?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Spare Parts Inventory
                    </div>
                    {searchResults.results.parts.map((p) => (
                      <div
                        key={`part-${p.id}`}
                        onClick={() => handleSearchResultClick(p.url)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: '#f8fafc',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Package size={14} color="#16a34a" />
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>{p.title}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{p.subtitle}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: p.status === 'LOW STOCK' ? '#dc2626' : '#16a34a' }}>
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Documents & Manuals */}
                {searchResults.results.documents?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Manuals & SOPs
                    </div>
                    {searchResults.results.documents.map((d) => (
                      <div
                        key={`doc-${d.id}`}
                        onClick={() => handleSearchResultClick(d.url)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: '#f8fafc',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={14} color="#7c3aed" />
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>{d.title}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{d.subtitle}</div>
                          </div>
                        </div>
                        <ArrowRight size={14} color="#94a3b8" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Ask EquipFix AI, Notifications, User Profile Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Prominent Ask EquipFix AI Copilot Button */}
        <button
          type="button"
          onClick={() => setShowCopilotModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '7px 14px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
          title="Open AI Diagnostics Copilot (Ctrl+K / Cmd+K)"
        >
          <Sparkles size={15} color="#e0f2fe" />
          <span>Ask EquipFix AI</span>
          <span style={{
            fontSize: '0.65rem',
            backgroundColor: 'rgba(255, 255, 255, 0.22)',
            padding: '1px 5px',
            borderRadius: '4px',
            marginLeft: '4px'
          }}>
            ⌘K
          </span>
        </button>

        {/* Notifications Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              position: 'relative'
            }}
            title="Notification Center"
          >
            <Bell size={18} color="#475569" />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#ef4444',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: 700,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '46px',
              width: '380px',
              maxHeight: '460px',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
              border: '1px solid #e2e8f0',
              padding: '14px',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                  Notifications ({unreadCount} unread)
                </strong>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                {['ALL', 'UNREAD', 'APPROVALS', 'ALERTS'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveNotifTab(tab)}
                    style={{
                      border: 'none',
                      background: activeNotifTab === tab ? '#2563eb' : '#f1f5f9',
                      color: activeNotifTab === tab ? '#ffffff' : '#64748b',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Notification List */}
              <div style={{ overflowY: 'auto', flex: 1, maxHeight: '330px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredNotifications.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                    No notifications in this view.
                  </div>
                ) : (
                  filteredNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkOneRead(n.id, n)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        backgroundColor: n.is_read ? '#ffffff' : '#f8fafc',
                        border: n.is_read ? '1px solid #f1f5f9' : '1px solid #dbeafe',
                        borderLeft: `4px solid ${
                          n.notification_type === 'ALERT' || n.notification_type === 'LOW_STOCK'
                            ? '#ef4444'
                            : n.notification_type === 'APPROVAL'
                            ? '#f59e0b'
                            : '#2563eb'
                        }`,
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{n.title}</span>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: '#475569', margin: '4px 0 0 0', lineHeight: 1.35 }}>
                        {n.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Demo Switcher Dropdown */}
        <div ref={profileMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '8px',
              transition: 'background 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: '#0f172a',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: 700,
              overflow: 'hidden',
              border: '2px solid #38bdf8'
            }}>
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user?.full_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                user?.full_name ? user.full_name[0] : 'U'
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#0f172a' }}>{user?.full_name}</span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#2563eb',
                letterSpacing: '0.04em'
              }}>
                {user?.role?.name || user?.role}
              </span>
            </div>
            <ChevronDown size={14} color="#64748b" />
          </button>

          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '46px',
              width: '320px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 16px 36px rgba(15, 23, 42, 0.18)',
              border: '1px solid #e2e8f0',
              padding: '16px',
              zIndex: 100
            }}>
              {/* User Identity Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                paddingBottom: '12px',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <div
                  onClick={() => {
                    setShowProfilePhotoModal(true);
                    setShowProfileMenu(false);
                  }}
                  title="Click to view full screen profile photo"
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    border: '2px solid #38bdf8'
                  }}
                >
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user?.full_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    user?.full_name ? user.full_name[0] : 'U'
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.full_name}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.email}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      border: '1px solid #bfdbfe'
                    }}>
                      {user?.role?.name || user?.role}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>@{user?.username}</span>
                  </div>
                </div>
              </div>





              {/* Station Settings & Signout Links */}
              <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Link
                  to="/settings"
                  onClick={() => setShowProfileMenu(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    color: '#334155',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'background 0.15s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Settings size={14} color="#64748b" />
                  <span>Station Preferences & Settings</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowLogoutModal(true);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <LogOut size={14} />
                  <span>Sign Out of Plant Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global AI Copilot Modal */}
      <AICopilotModal
        isOpen={showCopilotModal}
        onClose={() => setShowCopilotModal(false)}
      />

      {/* Cosmic Animated Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          setShowLogoutModal(false);
          logout();
          navigate('/login');
        }}
        user={user}
      />

      {/* Full-Screen Clearly Visible Profile Image Modal */}
      <ProfileImageModal
        isOpen={showProfilePhotoModal}
        onClose={() => setShowProfilePhotoModal(false)}
        user={user}
      />
    </header>
  );
};

