import React, { useState, useEffect } from 'react';
import { partsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { Package, Plus, RefreshCw, AlertTriangle, Search, History } from 'lucide-react';

export const PartsPage = () => {
  const { hasRole } = useAuth();
  const { lastEvent, addToast } = useWebSocket();
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Restock Modal State
  const [restockPart, setRestockPart] = useState(null);
  const [restockQty, setRestockQty] = useState(10);
  const [restockReason, setRestockReason] = useState('');
  const [restocking, setRestocking] = useState(false);

  // New Part Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [partForm, setPartForm] = useState({
    part_number: '',
    name: '',
    description: '',
    quantity: 10,
    min_quantity: 5,
    unit_cost: 50.0,
    location: 'Aisle 1, Bin 01',
  });
  const [savingPart, setSavingPart] = useState(false);

  const loadParts = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (lowStockFilter) params.low_stock_only = true;
      const res = await partsApi.list(params);
      setParts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParts();
  }, [search, lowStockFilter, lastEvent]);

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockPart || restockQty <= 0) return;
    setRestocking(true);
    try {
      await partsApi.restock(restockPart.id, {
        quantity_to_add: parseInt(restockQty),
        reason: restockReason || 'Warehouse restocking shipment',
      });
      addToast('Inventory Restocked', `Added ${restockQty} units to ${restockPart.name}.`, 'success');
      setRestockPart(null);
      setRestockQty(10);
      setRestockReason('');
      loadParts();
    } catch (err) {
      addToast('Restock Failed', err.response?.data?.detail || 'Restock operation failed.', 'error');
    } finally {
      setRestocking(false);
    }
  };

  const handleCreatePart = async (e) => {
    e.preventDefault();
    setSavingPart(true);
    try {
      await partsApi.create(partForm);
      addToast('Part Registered', `Added SKU ${partForm.part_number} to inventory.`, 'success');
      setShowAddModal(false);
      setPartForm({
        part_number: '',
        name: '',
        description: '',
        quantity: 10,
        min_quantity: 5,
        unit_cost: 50.0,
        location: 'Aisle 1, Bin 01',
      });
      loadParts();
    } catch (err) {
      addToast('Part Creation Failed', err.response?.data?.detail || 'Failed to create spare part SKU.', 'error');
    } finally {
      setSavingPart(false);
    }
  };

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Spare Parts & Inventory</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Track critical components, monitor minimum stock safety thresholds, and handle replenishment restocks.
          </p>
        </div>
        {hasRole(['SUPERVISOR', 'MANAGER']) && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={16} /> Register New Part SKU
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '12px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <Search size={18} color="#94a3b8" />
            <input
              type="text"
              className="form-input"
              placeholder="Search part name, SKU number, or storage location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', padding: '6px' }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: '#b91c1c', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={lowStockFilter}
              onChange={(e) => setLowStockFilter(e.target.checked)}
            />
            Show Low-Stock Only
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU Part #</th>
                <th>Part Name & Description</th>
                <th>Current Stock</th>
                <th>Safety Min</th>
                <th>Unit Cost</th>
                <th>Warehouse Bin</th>
                <th>Status</th>
                {hasRole(['SUPERVISOR', 'MANAGER']) && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {parts.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    No spare parts found.
                  </td>
                </tr>
              ) : (
                parts.map((p) => {
                  const isLow = p.quantity <= p.min_quantity;
                  return (
                    <tr key={p.id}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0f172a' }}>
                          {p.part_number}
                        </span>
                      </td>
                      <td>
                        <strong>{p.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.description}</div>
                      </td>
                      <td>
                        <strong style={{ fontSize: '1rem', color: isLow ? '#dc2626' : '#0f172a' }}>
                          {p.quantity}
                        </strong>
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{p.min_quantity} units</td>
                      <td style={{ color: '#059669', fontWeight: 600 }}>${p.unit_cost.toFixed(2)}</td>
                      <td style={{ fontSize: '0.85rem' }}>{p.location}</td>
                      <td>
                        {isLow ? (
                          <span className="badge badge-down" style={{ fontSize: '0.65rem' }}>
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="badge badge-running" style={{ fontSize: '0.65rem' }}>
                            ADEQUATE
                          </span>
                        )}
                      </td>
                      {hasRole(['SUPERVISOR', 'MANAGER']) && (
                        <td>
                          <button
                            onClick={() => setRestockPart(p)}
                            className="btn btn-secondary btn-sm"
                          >
                            <RefreshCw size={13} /> Restock
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      {restockPart && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                Restock Inventory: {restockPart.name}
              </strong>
              <button
                onClick={() => setRestockPart(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleRestockSubmit}>
              <div className="modal-body">
                <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>SKU: <strong>{restockPart.part_number}</strong> | Location: {restockPart.location}</div>
                  <div style={{ fontSize: '0.85rem', color: '#1e293b', marginTop: '4px' }}>
                    Current Available Stock: <strong>{restockPart.quantity} units</strong> (Min: {restockPart.min_quantity})
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity to Add *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Restocking Reference / Supplier PO Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Purchase Order PO-8921 from Timken Bearing"
                    value={restockReason}
                    onChange={(e) => setRestockReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRestockPart(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={restocking}
                >
                  {restocking ? 'Updating...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Part Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <strong style={{ fontSize: '1rem', color: '#0f172a' }}>Register New Spare Part SKU</strong>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreatePart}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">SKU Part Number *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. BRG-205"
                      value={partForm.part_number}
                      onChange={(e) => setPartForm({ ...partForm, part_number: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Part Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Angular Contact Bearing 205"
                      value={partForm.name}
                      onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description & Application</label>
                  <textarea
                    className="form-textarea"
                    rows="2"
                    placeholder="Specifications, size, compatible machines..."
                    value={partForm.description}
                    onChange={(e) => setPartForm({ ...partForm, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Initial Quantity *</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={partForm.quantity}
                      onChange={(e) => setPartForm({ ...partForm, quantity: parseInt(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Safety Minimum *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={partForm.min_quantity}
                      onChange={(e) => setPartForm({ ...partForm, min_quantity: parseInt(e.target.value) || 1 })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit Cost ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input"
                      value={partForm.unit_cost}
                      onChange={(e) => setPartForm({ ...partForm, unit_cost: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Warehouse Bin / Location *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Aisle 3, Shelf B, Bin 12"
                    value={partForm.location}
                    onChange={(e) => setPartForm({ ...partForm, location: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingPart}
                >
                  {savingPart ? 'Saving...' : 'Add Spare Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
