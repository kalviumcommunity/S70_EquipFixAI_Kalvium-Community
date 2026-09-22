import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users } from 'lucide-react';

export const DemoBar = () => {
  const { user, switchDemoUser } = useAuth();

  const accounts = [
    { username: 'operator1', label: 'Operator (John)', role: 'OPERATOR' },
    { username: 'tech1', label: 'Tech 1 (Ravi)', role: 'TECHNICIAN' },
    { username: 'tech2', label: 'Tech 2 (Carlos)', role: 'TECHNICIAN' },
    { username: 'super1', label: 'Supervisor (Sarah)', role: 'SUPERVISOR' },
    { username: 'manager1', label: 'Manager (David)', role: 'MANAGER' },
  ];

  return (
    <div className="demo-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Users size={14} color="#60a5fa" />
        <span style={{ fontWeight: 600, letterSpacing: '0.02em' }}>Quick Role Switcher:</span>
      </div>
      <div className="demo-pills">
        {accounts.map((acc) => {
          const isActive = user?.username === acc.username;
          return (
            <button
              key={acc.username}
              className={`demo-pill ${isActive ? 'active' : ''}`}
              onClick={() => switchDemoUser(acc.username)}
              title={`Switch session to ${acc.label}`}
            >
              {acc.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
