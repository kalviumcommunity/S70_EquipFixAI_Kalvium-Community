import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useToast } from '../components/common/ToastContainer';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const { addToast } = useToast();
  const wsRef = useRef(null);
  const pingIntervalRef = useRef(null);

  const notify = (title, message, type = 'info') => {
    addToast({ title, message, type, duration: 5500 });
  };

  useEffect(() => {
    const token = localStorage.getItem('equipfix_token');
    if (!token) {
      setConnected(false);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isDev = window.location.port === '5173';
    const wsHost = isDev ? 'localhost:8000' : window.location.host;
    const wsUrl = `${protocol}//${wsHost}/api/ws?token=${encodeURIComponent(token)}`;

    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) return;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          // Heartbeat ping every 25 seconds
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'pong') return;

            setLastEvent(data);

            const payload = data.data || {};
            switch (data.event) {
              case 'incident.created':
                notify(
                  `🚨 Incident ${payload.incident_number || 'Reported'}`,
                  `Machine ${payload.machine_code || ''}: ${payload.description?.slice(0, 70) || ''}`,
                  'warning'
                );
                break;
              case 'incident.assigned':
                notify(
                  `🔧 Incident Assigned: ${payload.incident_number}`,
                  `Assigned to ${payload.technician_name} (WO: ${payload.work_order_number})`,
                  'info'
                );
                break;
              case 'work_order.updated':
                notify(
                  `📋 WO ${payload.work_order_number || ''} Updated`,
                  `Status changed to ${payload.status}`,
                  'info'
                );
                break;
              case 'work_order.completed':
                notify(
                  `✅ Work Order Completed`,
                  `WO ${payload.work_order_number} submitted for review`,
                  'success'
                );
                break;
              case 'maintenance.pending_approval':
                notify(
                  `⏳ Approval Required`,
                  `Record #${payload.maintenance_record_id} requires supervisor review`,
                  'warning'
                );
                break;
              case 'maintenance.approved':
                notify(
                  `🎉 Maintenance Approved`,
                  `Machine ${payload.machine_code || ''} restored to service.`,
                  'success'
                );
                break;
              case 'machine.status_changed':
                notify(
                  `⚡ Machine Status Changed`,
                  `${payload.machine_code}: ${payload.status}`,
                  payload.status === 'DOWN' ? 'error' : payload.status === 'RUNNING' ? 'success' : 'warning'
                );
                break;
              case 'inventory.low_stock':
                notify(
                  `📦 Low Stock Alert`,
                  `${payload.name} (${payload.part_number}) is down to ${payload.remaining_quantity} units!`,
                  'error'
                );
                break;
              case 'notification.created':
                notify(payload.title || 'Notification', payload.message || '', 'info');
                break;
              case 'NOTIFICATION_CREATED':
                notify(payload.title, payload.message, payload.type);
                break;
              default:
                break;
            }
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          clearInterval(pingIntervalRef.current);
          if (!isUnmounted) {
            setTimeout(connect, 5000);
          }
        };

        ws.onerror = (err) => {
          console.warn('WebSocket connection error:', err);
          ws.close();
        };
      } catch (err) {
        console.error('WebSocket init failed:', err);
      }
    };

    connect();

    return () => {
      isUnmounted = true;
      if (wsRef.current) wsRef.current.close();
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [localStorage.getItem('equipfix_token')]);

  return (
    <WebSocketContext.Provider value={{ connected, lastEvent, addToast: notify }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
