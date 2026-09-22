import React from 'react';
import { useAuth } from '../context/AuthContext';
import { OperatorDashboard } from './dashboards/OperatorDashboard';
import { TechnicianDashboard } from './dashboards/TechnicianDashboard';
import { SupervisorDashboard } from './dashboards/SupervisorDashboard';
import { ManagerDashboard } from './dashboards/ManagerDashboard';

export const DashboardPage = () => {
  const { user } = useAuth();
  const role = user?.role?.name?.toUpperCase();

  switch (role) {
    case 'OPERATOR':
      return <OperatorDashboard />;
    case 'TECHNICIAN':
      return <TechnicianDashboard />;
    case 'SUPERVISOR':
      return <SupervisorDashboard />;
    case 'MANAGER':
      return <ManagerDashboard />;
    default:
      return (
        <div className="page-body">
          <h2>Unknown user role: {role}</h2>
        </div>
      );
  }
};
