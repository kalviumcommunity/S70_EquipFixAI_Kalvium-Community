import React, { useState, useEffect } from 'react';
import { notificationsApi } from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';
import { Bell, CheckCheck, RefreshCw, AlertTriangle, CheckCircle, Info, Inbox } from 'lucide-react';
import { LoadingScreen } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, UNREAD, APPROVAL, ALERT
  const { lastEvent } = useWebSocket();

  const fetchNotifications = async () => {
    try {
      const res = await notificationsApi.list();
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [lastEvent]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = notifications.filter((n) => {
    const nType = n.notification_type || n.type;
    if (filter === 'UNREAD') return !n.is_read;
    if (filter === 'APPROVAL') return nType === 'APPROVAL';
    if (filter === 'ALERT') return nType === 'ALERT' || nType === 'STATUS_CHANGE';
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'APPROVAL': return <CheckCircle size={18} color="#059669" />;
      case 'ALERT': return <AlertTriangle size={18} color="#dc2626" />;
      case 'LOW_STOCK': return <AlertTriangle size={18} color="#d97706" />;
      default: return <Info size={18} color="#2563eb" />;
    }
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Bell size={24} color="var(--blue-600)" /> Operational Notification Center
          </h1>
          <p className="page-subtitle">
            Real-time plant alerts, work order assignments, supervisor approvals, and telemetry notices.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={fetchNotifications}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleMarkAllAsRead}>
            <CheckCheck size={14} /> Mark All Read
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--slate-200)', paddingBottom: '10px' }}>
        {['ALL', 'UNREAD', 'APPROVAL', 'ALERT'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: filter === tab ? 700 : 500,
              backgroundColor: filter === tab ? 'var(--blue-600)' : 'transparent',
              color: filter === tab ? '#ffffff' : 'var(--slate-600)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingScreen message="Loading notifications stream..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No notifications in this view"
          description="Your plant operational log has no active notifications matching this category filter."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{
                marginBottom: 0,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
                borderLeft: `4px solid ${item.is_read ? 'var(--slate-300)' : 'var(--blue-600)'}`,
                backgroundColor: item.is_read ? 'var(--white)' : '#f8faff'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ marginTop: '2px' }}>
                  {getIcon(item.notification_type || item.type)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-900)' }}>
                      {item.title}
                    </span>
                    {!item.is_read && (
                      <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>NEW</span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginTop: '4px', lineHeight: 1.4 }}>
                    {item.message}
                  </p>
                  <span style={{ fontSize: '0.725rem', color: 'var(--slate-400)', marginTop: '6px', display: 'inline-block' }}>
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {!item.is_read && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleMarkAsRead(item.id)}
                >
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
