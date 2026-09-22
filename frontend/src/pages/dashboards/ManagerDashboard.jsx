import React, { useState, useEffect, useRef } from 'react';
import { analyticsApi, partsApi, maintenanceApi, reportsApi } from '../../services/api';
import { useWebSocket } from '../../context/WebSocketContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid
} from 'recharts';
import {
  Cpu, AlertTriangle, Clock, DollarSign, Package,
  Users, TrendingUp, ShieldAlert, Download, RefreshCw,
  Layers, CheckCircle2, Sparkles, Factory, FileSpreadsheet,
  Activity, ArrowUpRight, BarChart3, ChevronRight, FileText,
  ShieldCheck, Check, AlertCircle, Info, Calendar, LayoutDashboard
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import AICopilotPromptCard from '../../components/ai/AICopilotPromptCard';

const DEFAULT_ANALYTICS = {
  machine_status: { running: 5, warning: 1, down: 1, maintenance: 1, total: 8 },
  active_incidents_count: 3,
  pending_approvals_count: 1,
  total_downtime_hours: 4.8,
  total_maintenance_cost: 155.0,
  low_stock_parts_count: 1,
  technician_workload: [
    { technician_id: 2, technician_name: 'Ravi Sharma (Senior Tech)', active_jobs: 2, completed_jobs: 0, avg_resolution_hours: 0.0 },
    { technician_id: 3, technician_name: 'Carlos Mendez (Field Tech)', active_jobs: 0, completed_jobs: 1, avg_resolution_hours: 1.8 },
  ],
  recurring_failures: [
    { machine_code: 'MILL-01', machine_name: 'Vertical Knee Milling Machine', failure_count: 2, primary_root_cause: 'Normal operational fatigue and oil mist accumulation causing belt slippage.' },
    { machine_code: 'CNC-03', machine_name: 'Horizontal CNC Boring Mill', failure_count: 1, primary_root_cause: 'Coolant flow pressure sensor showing erratic spikes.' },
    { machine_code: 'CNC-04', machine_name: 'High-Speed Precision Spindle CNC 04', failure_count: 1, primary_root_cause: 'Spindle abnormal noise and excessive vibration exceeding 7mm/s.' },
  ],
  downtime_by_machine: [
    { machine_code: 'PRESS-01', machine_name: '200-Ton Hydraulic Stamping Press', department: 'Stamping Dept', total_downtime_minutes: 180, incident_count: 0, mttr_minutes: 180.0 },
    { machine_code: 'MILL-01', machine_name: 'Vertical Knee Milling Machine', department: 'Fabrication Dept', total_downtime_minutes: 105, incident_count: 1, mttr_minutes: 105.0 },
    { machine_code: 'CNC-04', machine_name: 'High-Speed Precision Spindle CNC 04', department: 'Machining Dept', total_downtime_minutes: 0, incident_count: 1, mttr_minutes: 0.0 },
    { machine_code: 'CNC-03', machine_name: 'Horizontal CNC Boring Mill', department: 'Machining Dept', total_downtime_minutes: 0, incident_count: 1, mttr_minutes: 0.0 },
  ],
  subsystem_failures: [
    { subsystem: 'Spindle & Drive Motor', failure_count: 3, common_cause: 'Normal operational fatigue and oil mist accumulation causing belt slippage.' },
    { subsystem: 'Hydraulic & Fluid Power', failure_count: 2, common_cause: 'Damaged cylinder rod wiper seal caused by contamination particles.' },
    { subsystem: 'Bearings & Motion Guides', failure_count: 0, common_cause: 'Operating within normal nominal limits' },
    { subsystem: 'Cooling & Thermal Unit', failure_count: 0, common_cause: 'Operating within normal nominal limits' },
    { subsystem: 'Electrical & Sensors', failure_count: 0, common_cause: 'Operating within normal nominal limits' },
  ],
  maintenance_trends: [],
};

export const ManagerDashboard = () => {
  const { lastEvent, addToast } = useWebSocket();
  const location = useLocation();

  const [analytics, setAnalytics] = useState(() => {
    try {
      const cached = localStorage.getItem('equipfix_manager_analytics_cache');
      return cached ? JSON.parse(cached) : DEFAULT_ANALYTICS;
    } catch {
      return DEFAULT_ANALYTICS;
    }
  });

  const [lowStockParts, setLowStockParts] = useState(() => {
    try {
      const cached = localStorage.getItem('equipfix_low_stock_parts_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scanningSchedules, setScanningSchedules] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Active Tab: 'overview' | 'analytics' | 'reports' | 'workforce'
  const [activeTab, setActiveTab] = useState(() => {
    if (location.hash === '#analytics') return 'analytics';
    if (location.hash === '#reports') return 'reports';
    if (location.hash === '#workforce') return 'workforce';
    return 'overview';
  });

  // Sync activeTab when hash changes
  useEffect(() => {
    if (location.hash === '#analytics') setActiveTab('analytics');
    else if (location.hash === '#reports') setActiveTab('reports');
    else if (location.hash === '#workforce') setActiveTab('workforce');
    else if (!location.hash) setActiveTab('overview');
  }, [location.hash]);

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [anRes, partsRes] = await Promise.all([
        analyticsApi.getDashboard(),
        partsApi.list({ low_stock_only: true }),
      ]);
      if (anRes?.data) {
        setAnalytics(anRes.data);
        localStorage.setItem('equipfix_manager_analytics_cache', JSON.stringify(anRes.data));
      }
      if (partsRes?.data) {
        setLowStockParts(partsRes.data);
        localStorage.setItem('equipfix_low_stock_parts_cache', JSON.stringify(partsRes.data));
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading manager dashboard analytics:', err);
    } finally {
      setLoading(false);
      if (isManual) {
        setTimeout(() => setRefreshing(false), 300);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [lastEvent]);

  // Periodic background refresh every 45s
  useEffect(() => {
    const timer = setInterval(() => {
      loadData();
    }, 45000);
    return () => clearInterval(timer);
  }, []);

  const handleRunPMScheduler = async () => {
    setScanningSchedules(true);
    try {
      const res = await maintenanceApi.checkDue();
      const { work_orders_created, duplicates_prevented } = res.data;
      addToast(
        'PM Scheduler Scan Completed',
        `Generated ${work_orders_created.length} work order(s). Prevented ${duplicates_prevented.length} duplicate(s).`,
        'success'
      );
      loadData();
    } catch (err) {
      console.error(err);
      addToast('Scan Failed', 'Failed to execute preventive maintenance scan.', 'error');
    } finally {
      setScanningSchedules(false);
    }
  };

  const handleDownloadCsv = async (reportType, label) => {
    setDownloadingReport(reportType);
    try {
      await reportsApi.downloadReportCsv(reportType);
      addToast('Report Exported', `${label} downloaded successfully.`, 'success');
    } catch (err) {
      console.error('Download error:', err);
      addToast('Export Failed', `Could not export ${label}. Please retry.`, 'error');
    } finally {
      setDownloadingReport(null);
    }
  };

  const machine_status = analytics?.machine_status || DEFAULT_ANALYTICS.machine_status;

  // Donut chart data for machine fleet status
  const machinePieData = [
    { name: 'Running', value: machine_status.running, color: '#10b981' },
    { name: 'Warning', value: machine_status.warning, color: '#f59e0b' },
    { name: 'Down', value: machine_status.down, color: '#ef4444' },
    { name: 'Maintenance', value: machine_status.maintenance, color: '#8b5cf6' },
  ].filter((d) => d.value > 0);

  const availabilityPercent = machine_status.total > 0
    ? Math.round((machine_status.running / machine_status.total) * 100)
    : 100;

  return (
    <div className="page-body" style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* ==================== 1. EXECUTIVE HEADER & CONTROLS ==================== */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
        backgroundColor: '#ffffff',
        padding: '20px 24px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Plant Operations Command & Analytics
            </h1>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              padding: '3px 9px',
              borderRadius: '9999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Activity size={12} /> LIVE SHOP FLOOR
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '6px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Real-time manufacturing KPIs, telemetry diagnostics, and spare parts reliability.</span>
            <span>•</span>
            <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
              Synced: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh plant data from live database"
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Live Sync'}
          </button>

          <button
            type="button"
            onClick={handleRunPMScheduler}
            disabled={scanningSchedules}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Scan preventive maintenance schedules for due tasks"
          >
            <Calendar size={14} className={scanningSchedules ? 'spin' : ''} />
            {scanningSchedules ? 'Scanning...' : 'Scan Due PM'}
          </button>

          <Link to="/audit-logs" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={14} /> Audit Trail
          </Link>

          <Link to="/users" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={14} /> Personnel
          </Link>
        </div>
      </div>

      {/* ==================== 2. INTERACTIVE SECTION TABS ==================== */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '22px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '2px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard, hash: '' },
          { id: 'analytics', label: 'Plant Analytics & MTTR', icon: BarChart3, hash: '#analytics' },
          { id: 'reports', label: 'Reports & Exports', icon: FileSpreadsheet, hash: '#reports' },
          { id: 'workforce', label: 'Technician Output', icon: Users, hash: '#workforce' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                window.location.hash = tab.hash;
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#1d4ed8' : '#64748b',
                backgroundColor: isActive ? '#eff6ff' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} color={isActive ? '#2563eb' : '#64748b'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Prominent AI Copilot Prompt Entry Card */}
      <div style={{ marginBottom: '22px' }}>
        <AICopilotPromptCard
          title="EquipFix AI Operations Director Copilot"
          subtitle="Query fleet-wide MTTR benchmarks, extract predictive breakdown patterns, and verify OSHA safety compliance."
        />
      </div>

      {/* ==================== 3. HIGH-LEVEL KPI METRIC CARDS ==================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Availability */}
        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#ecfdf5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Cpu size={24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {availabilityPercent}%
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>
              Fleet Availability
            </div>
            <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
              {machine_status.running} of {machine_status.total} Running
            </div>
          </div>
        </div>

        {/* Active Incidents */}
        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {analytics.active_incidents_count}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>
              Active Incidents
            </div>
            <div style={{ fontSize: '0.7rem', color: analytics.pending_approvals_count > 0 ? '#d97706' : '#16a34a', fontWeight: 600, marginTop: '2px' }}>
              {analytics.pending_approvals_count} awaiting supervisor sign-off
            </div>
          </div>
        </div>

        {/* Plant Downtime */}
        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#fff7ed',
            color: '#ea580c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Clock size={24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {analytics.total_downtime_hours}h
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>
              Cumulative Downtime
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
              Across all manufacturing cells
            </div>
          </div>
        </div>

        {/* Parts Cost */}
        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#f0fdf4',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <DollarSign size={24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              ${analytics.total_maintenance_cost.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>
              Parts & Repair Cost
            </div>
            <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
              Drawn from real inventory logs
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: analytics.low_stock_parts_count > 0 ? '#fef2f2' : '#f8fafc',
            color: analytics.low_stock_parts_count > 0 ? '#b91c1c' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Package size={24} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
              {analytics.low_stock_parts_count}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>
              Low Stock Alerts
            </div>
            <div style={{ fontSize: '0.7rem', color: analytics.low_stock_parts_count > 0 ? '#b91c1c' : '#10b981', fontWeight: 600, marginTop: '2px' }}>
              {analytics.low_stock_parts_count > 0 ? 'Below safety reorder threshold' : 'Optimal inventory levels'}
            </div>
          </div>
        </div>
      </div>

      {/* ==================== TAB 1: EXECUTIVE OVERVIEW ==================== */}
      {activeTab === 'overview' && (
        <>
          {/* Row 1: Donut Fleet Chart + Low Stock Inventory Alerts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '22px', marginBottom: '24px' }}>
            {/* Donut Fleet Chart */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Cpu size={18} color="#2563eb" />
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                    Machinery Operational Distribution
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                  {machine_status.total} Fleet Units
                </span>
              </div>

              <div style={{ height: '240px', width: '100%', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={machinePieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {machinePieData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [`${val} Units`, name]}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Donut Center Total Text */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{machine_status.total}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Assets</span>
                </div>
              </div>

              {/* Clean Legend Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid #f1f5f9'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Running</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>{machine_status.running}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Warning</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f59e0b' }}>{machine_status.warning}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Down</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ef4444' }}>{machine_status.down}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Maintenance</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#8b5cf6' }}>{machine_status.maintenance}</div>
                </div>
              </div>
            </div>

            {/* Low Stock Alerts Card */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={18} color="#dc2626" />
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                    Critical Spare Parts Below Threshold
                  </span>
                </div>
                <Link to="/parts" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>
                  Inventory Hub →
                </Link>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {lowStockParts.length === 0 ? (
                  <div style={{
                    padding: '36px 20px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1'
                  }}>
                    <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 8px auto' }} />
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                      All Inventory Levels Healthy
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                      Every spare part is currently stocked above minimum threshold limits.
                    </div>
                  </div>
                ) : (
                  lowStockParts.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                        backgroundColor: '#fff5f5',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#991b1b' }}>{p.name}</div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '2px' }}>
                          SKU: <strong style={{ fontFamily: 'var(--font-mono)' }}>{p.part_number}</strong> • Location: {p.location}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          fontSize: '0.825rem',
                          fontWeight: 800,
                          color: '#dc2626',
                          backgroundColor: '#fee2e2',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          {p.quantity} / {p.min_quantity} min
                        </span>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                          ${p.unit_cost}/unit
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Equipment Downtime & MTTR Ranking Table */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} color="#c2410c" /> Equipment Downtime & MTTR Ranking
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Sorted dynamically by highest cumulative plant downtime
                </span>
              </div>
              <Link to="/machines" className="btn btn-secondary btn-sm">
                View All Machines
              </Link>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Machine Code & Name</th>
                    <th>Department</th>
                    <th>Total Downtime</th>
                    <th>Incidents Logged</th>
                    <th>MTTR (Mean Time to Resolve)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.downtime_by_machine?.map((m) => (
                    <tr key={m.machine_code}>
                      <td>
                        <strong style={{ color: '#0f172a', fontFamily: 'var(--font-mono)' }}>{m.machine_code}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.machine_name}</div>
                      </td>
                      <td>{m.department}</td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: m.total_downtime_minutes > 120 ? '#dc2626' : m.total_downtime_minutes > 0 ? '#ea580c' : '#10b981'
                        }}>
                          {m.total_downtime_minutes} mins ({(m.total_downtime_minutes / 60).toFixed(1)}h)
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#334155' }}>
                          {m.incident_count} reported
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: m.mttr_minutes > 0 ? '#1e293b' : '#94a3b8' }}>
                          {m.mttr_minutes > 0 ? `${m.mttr_minutes} mins` : 'Nominal'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${m.total_downtime_minutes > 120 ? 'down' : m.total_downtime_minutes > 0 ? 'warning' : 'running'}`}>
                          {m.total_downtime_minutes > 120 ? 'ATTENTION' : m.total_downtime_minutes > 0 ? 'MONITOR' : 'OPTIMAL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ==================== TAB 2: DEEP ANALYTICS & MTTR ==================== */}
      {activeTab === 'analytics' && (
        <>
          {/* Row 1: Subsystem Failures Matrix + Monthly Maintenance Spend Trend */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '22px', marginBottom: '24px' }}>
            {/* Subsystem Failures Matrix */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Layers size={18} color="#7c3aed" />
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  Subsystem Breakdown & Failure Frequency
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {analytics.subsystem_failures?.map((sf) => (
                  <div
                    key={sf.subsystem}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: sf.failure_count > 0 ? '#f8fafc' : '#ffffff'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>{sf.subsystem}</strong>
                      <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '2px', maxWidth: '340px' }}>
                        Common Cause: <em>{sf.common_cause}</em>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span
                        className={sf.failure_count > 0 ? 'badge badge-critical' : 'badge badge-running'}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {sf.failure_count} {sf.failure_count === 1 ? 'Event' : 'Events'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Trend Chart */}
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <TrendingUp size={18} color="#16a34a" />
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  Monthly Maintenance Costs & Frequency
                </span>
              </div>
              <div style={{ height: '280px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.maintenance_trends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="cost" orientation="left" tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val, name) => [name === 'Parts Cost ($)' ? `$${val}` : val, name]}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                    <Bar yAxisId="cost" dataKey="total_cost" name="Parts Cost ($)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="count" dataKey="maintenance_count" name="Maintenance Actions" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recurring Failures Top Machines */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} color="#dc2626" /> Top Machines by Recurring Incident Frequency
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Derived from live machine incidents and completed work orders
              </span>
            </div>
            {analytics.recurring_failures?.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                No recurring failures registered across manufacturing lines.
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Machine Code</th>
                      <th>Equipment Description</th>
                      <th>Recorded Incidents</th>
                      <th>Primary Root Cause or Symptom</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recurring_failures.map((rf) => (
                      <tr key={rf.machine_code}>
                        <td>
                          <strong style={{ fontFamily: 'var(--font-mono)', color: '#2563eb' }}>{rf.machine_code}</strong>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{rf.machine_name}</span>
                        </td>
                        <td>
                          <span className="badge badge-high" style={{ fontSize: '0.75rem' }}>
                            {rf.failure_count} {rf.failure_count === 1 ? 'incident' : 'incidents'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.825rem', color: '#334155', maxWidth: '420px' }}>
                          {rf.primary_root_cause}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ==================== TAB 3: REPORTS & EXPORTS ==================== */}
      {activeTab === 'reports' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {/* Report Card 1: Maintenance Records */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FileText size={20} color="#2563eb" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Maintenance History Log
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, margin: '0 0 16px 0' }}>
                Complete historical record of machine repairs, technician root cause analyses, downtime minutes, and supervisor approvals.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadCsv('maintenance', 'Maintenance History CSV')}
              disabled={downloadingReport === 'maintenance'}
              className="btn btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Download size={15} className={downloadingReport === 'maintenance' ? 'spin' : ''} />
              {downloadingReport === 'maintenance' ? 'Generating...' : 'Download CSV Report'}
            </button>
          </div>

          {/* Report Card 2: Incident Logs */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertTriangle size={20} color="#f59e0b" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Incident Dispatch Log
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, margin: '0 0 16px 0' }}>
                Chronological list of plant floor trouble reports, severity rankings, operator submissions, and resolution times.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadCsv('incidents', 'Incident Logs CSV')}
              disabled={downloadingReport === 'incidents'}
              className="btn btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Download size={15} className={downloadingReport === 'incidents' ? 'spin' : ''} />
              {downloadingReport === 'incidents' ? 'Generating...' : 'Download CSV Report'}
            </button>
          </div>

          {/* Report Card 3: Machine Downtime */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Clock size={20} color="#ea580c" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Equipment Downtime Analysis
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, margin: '0 0 16px 0' }}>
                Aggregated downtime metrics per machine asset, MTTR (Mean Time to Repair), and availability loss percentages.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadCsv('downtime', 'Downtime Analysis CSV')}
              disabled={downloadingReport === 'downtime'}
              className="btn btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Download size={15} className={downloadingReport === 'downtime' ? 'spin' : ''} />
              {downloadingReport === 'downtime' ? 'Generating...' : 'Download CSV Report'}
            </button>
          </div>

          {/* Report Card 4: Technician Productivity */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Users size={20} color="#10b981" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Technician Workload & MTTR
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4, margin: '0 0 16px 0' }}>
                Individual technician repair output, average resolution hours per work ticket, and active maintenance assignments.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadCsv('technicians', 'Technician Productivity CSV')}
              disabled={downloadingReport === 'technicians'}
              className="btn btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Download size={15} className={downloadingReport === 'technicians' ? 'spin' : ''} />
              {downloadingReport === 'technicians' ? 'Generating...' : 'Download CSV Report'}
            </button>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: TECHNICIAN OUTPUT & WORKFORCE ==================== */}
      {activeTab === 'workforce' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Workload Bar Chart */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Users size={18} color="#0f172a" />
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                Technician Work Orders: Active vs Completed
              </span>
            </div>
            <div style={{ height: '280px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.technician_workload}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="technician_name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }} />
                  <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                  <Bar dataKey="active_jobs" name="Active Assignments" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed_jobs" name="Completed Tickets" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Technician Table */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Technician Performance Matrix</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Real-time job distribution and resolution velocity
              </span>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Technician Name</th>
                    <th>Active Assignments</th>
                    <th>Completed Repairs</th>
                    <th>Average Resolution Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.technician_workload?.map((tech) => (
                    <tr key={tech.technician_id}>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{tech.technician_name}</strong>
                      </td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: tech.active_jobs > 0 ? '#ea580c' : '#64748b'
                        }}>
                          {tech.active_jobs} active
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#059669' }}>
                          {tech.completed_jobs} completed
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#334155' }}>
                          {tech.avg_resolution_hours > 0 ? `${tech.avg_resolution_hours}h` : 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${tech.active_jobs > 0 ? 'warning' : 'running'}`}>
                          {tech.active_jobs > 0 ? 'ON DISPATCH' : 'AVAILABLE'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
