import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  ArrowDownLeft, 
  ArrowUpRight, 
  RefreshCw, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  Boxes, 
  Warehouse, 
  SlidersHorizontal,
  X, 
  Calendar, 
  User, 
  FileText,
  Scale,
  Sparkles
} from 'lucide-react';
import api from '../api';

export default function OperationsView({ initialType = 'all', autoOpenAdjustment = false }) {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs & Filters
  const [activeTypeTab, setActiveTypeTab] = useState(initialType); // 'all' | 'receipt' | 'delivery' | 'internal' | 'adjustment'
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'draft' | 'waiting' | 'ready' | 'done' | 'canceled'
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (initialType && initialType !== 'all') {
      setActiveTypeTab(initialType);
    }
  }, [initialType]);

  // Modals
  const [isNewOpOpen, setIsNewOpOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(autoOpenAdjustment);
  const [selectedOp, setSelectedOp] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [qualityCounts, setQualityCounts] = useState({});

  // Master data for forms
  const [products, setProducts] = useState([]);
  const [allLocations, setAllLocations] = useState([]);

  // New Operation Form state
  const [opForm, setOpForm] = useState({
    type: 'receipt',
    partner_name: '',
    source_location_id: '',
    dest_location_id: '',
    notes: '',
    items: [{ product_id: '', demand_qty: 1 }]
  });

  // Quick Adjustment Form state
  const [adjForm, setAdjForm] = useState({
    product_id: '',
    location_id: '',
    current_stock: 0,
    counted_qty: 0,
    reason: 'Physical count audit correction'
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Fetch operations list
  const fetchOperations = async () => {
    setLoading(true);
    try {
      let url = '/operations?';
      if (activeTypeTab !== 'all') url += `type=${activeTypeTab}&`;
      if (selectedStatus !== 'all') url += `status=${selectedStatus}&`;
      if (search) url += `search=${encodeURIComponent(search)}&`;

      const res = await api.get(url);
      setOperations(res.operations || []);
    } catch (err) {
      console.error('Failed to load operations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch master data for dropdowns
  const fetchMasterData = async () => {
    try {
      const [prodRes, whRes] = await Promise.all([
        api.get('/products'),
        api.get('/warehouses')
      ]);
      setProducts(prodRes.products || []);
      setAllLocations(whRes.allLocations || []);
    } catch (err) {
      console.error('Failed to load master data:', err);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchOperations();
  }, [activeTypeTab, selectedStatus, search]);

  // Open Detailed View
  // Open Detailed View
  const handleOpenDetail = async (opId) => {
    setIsDetailOpen(true);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/operations/${opId}`);
      setSelectedOp(res.operation);
      // Initialize inspection counts for each item
      const initialCounts = {};
      (res.operation.items || []).forEach(item => {
        const isDone = res.operation.status === 'done';
        initialCounts[item.id] = {
          good_qty: item.good_qty !== undefined && item.good_qty !== null ? item.good_qty : (isDone ? item.done_qty : item.demand_qty),
          damaged_qty: item.damaged_qty !== undefined && item.damaged_qty !== null ? item.damaged_qty : 0
        };
      });
      setQualityCounts(initialCounts);
    } catch (err) {
      console.error('Failed to load operation details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Helper to update quality quantities during inspection
  const updateQualityCount = (itemId, field, value) => {
    setQualityCounts(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: Math.max(0, Number(value) || 0)
      }
    }));
  };

  // Validate Operation
  const handleValidate = async (opId) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post(`/operations/${opId}/validate`, {
        item_quality_quantities: qualityCounts
      });
      await handleOpenDetail(opId);
      await fetchOperations();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Check Availability
  const handleCheckAvailability = async (opId) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post(`/operations/${opId}/check-availability`);
      await handleOpenDetail(opId);
      await fetchOperations();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel Operation
  const handleCancelOp = async (opId) => {
    if (!window.confirm('Are you sure you want to cancel this operation?')) return;
    setSubmitting(true);
    try {
      await api.post(`/operations/${opId}/cancel`);
      await handleOpenDetail(opId);
      await fetchOperations();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Setup Defaults when opening New Operation Modal
  const handleOpenNewOp = (type = 'receipt') => {
    setFormError(null);
    const vendorLoc = allLocations.find(l => l.type === 'vendor');
    const custLoc = allLocations.find(l => l.type === 'customer');
    const mainStore = allLocations.find(l => l.type === 'internal');

    let src = '';
    let dst = '';
    let partner = '';

    if (type === 'receipt') {
      src = vendorLoc?.id || '';
      dst = mainStore?.id || '';
      partner = 'Apex Industrial Supplies Ltd';
    } else if (type === 'delivery') {
      src = mainStore?.id || '';
      dst = custLoc?.id || '';
      partner = 'Acme Construction Corp';
    } else if (type === 'internal') {
      const internals = allLocations.filter(l => l.type === 'internal');
      src = internals[0]?.id || '';
      dst = internals[1]?.id || internals[0]?.id || '';
      partner = 'Internal Department';
    }

    setOpForm({
      type,
      partner_name: partner,
      source_location_id: src,
      dest_location_id: dst,
      notes: '',
      items: [{ product_id: products[0]?.id || '', demand_qty: 10 }]
    });
    setIsNewOpOpen(true);
  };

  // Line item manipulation
  const addItemLine = () => {
    setOpForm(prev => ({
      ...prev,
      items: [...prev.items, { product_id: products[0]?.id || '', demand_qty: 1 }]
    }));
  };

  const removeItemLine = (index) => {
    if (opForm.items.length <= 1) return;
    setOpForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItemLine = (index, field, value) => {
    setOpForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  // Submit New Operation
  const handleCreateOperation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/operations', opForm);
      setIsNewOpOpen(false);
      await fetchOperations();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Quick Adjustment Modal
  const handleOpenAdjustment = () => {
    setFormError(null);
    const prod = products[0];
    const loc = allLocations.find(l => l.type === 'internal');
    setAdjForm({
      product_id: prod?.id || '',
      location_id: loc?.id || '',
      current_stock: prod?.current_stock || 0,
      counted_qty: prod?.current_stock || 0,
      reason: 'Physical cycle count adjustment'
    });
    setIsAdjustmentOpen(true);
  };

  // Submit Quick Adjustment
  const handleApplyAdjustment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/operations/quick-adjustment', {
        product_id: Number(adjForm.product_id),
        location_id: Number(adjForm.location_id),
        counted_qty: Number(adjForm.counted_qty),
        reason: adjForm.reason
      });
      setIsAdjustmentOpen(false);
      await fetchOperations();
      await fetchMasterData(); // update product on-hand stocks
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Badge helpers in Red & White Palette
  const getTypeBadge = (type) => {
    switch (type) {
      case 'receipt':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
            <ArrowDownLeft className="w-3 h-3" /> Receipt
          </span>
        );
      case 'delivery':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold">
            <ArrowUpRight className="w-3 h-3" /> Delivery
          </span>
        );
      case 'internal':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-bold">
            <ArrowLeftRight className="w-3 h-3" /> Internal Transfer
          </span>
        );
      case 'adjustment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
            <Scale className="w-3 h-3" /> Adjustment
          </span>
        );
      default:
        return <span>{type}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold uppercase">Draft</span>;
      case 'waiting':
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase">Waiting</span>;
      case 'ready':
        return <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold uppercase">Ready</span>;
      case 'done':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">Done</span>;
      case 'canceled':
        return <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase">Canceled</span>;
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-red-600" />
            Inventory Operations Hub
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Execute incoming Receipts, outgoing Deliveries, Internal Transfers, and Physical Count Adjustments.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleOpenAdjustment}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-amber-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5 text-amber-600" />
            <span>Stock Adjustment</span>
          </button>

          <button
            onClick={() => handleOpenNewOp('receipt')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Receipt</span>
          </button>

          <button
            onClick={() => handleOpenNewOp('delivery')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Delivery</span>
          </button>

          <button
            onClick={() => handleOpenNewOp('internal')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Internal Transfer</span>
          </button>
        </div>
      </div>

      {/* 2. Operations Type Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: 'All Operations' },
          { id: 'receipt', label: '📥 Receipts (Incoming)' },
          { id: 'delivery', label: '📤 Deliveries (Outgoing)' },
          { id: 'internal', label: '🔄 Internal Transfers' },
          { id: 'adjustment', label: '⚖️ Adjustments' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTypeTab(tab.id)}
            className={`px-4 py-2 font-bold rounded-t-xl transition border-b-2 whitespace-nowrap cursor-pointer ${
              activeTypeTab === tab.id
                ? 'border-red-600 text-red-600 bg-red-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Filters & Search Bar in Red & White Style */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-wrap items-center gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference (e.g. WH/IN/0001), partner, or notes..."
            className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
          {['all', 'draft', 'waiting', 'ready', 'done', 'canceled'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1 rounded-lg capitalize font-bold transition text-[11px] cursor-pointer ${
                selectedStatus === st
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <button
          onClick={fetchOperations}
          className="p-2 rounded-xl bg-white text-slate-500 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
        </button>
      </div>

      {/* 4. Operations Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Reference</th>
                <th className="py-3.5 px-4">Product Name(s)</th>
                <th className="py-3.5 px-4">Partner / Party</th>
                <th className="py-3.5 px-4">Route (From → To)</th>
                <th className="py-3.5 px-4">Product Quality Workflow</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-red-600" />
                    Loading operations...
                  </td>
                </tr>
              ) : operations.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No operations match your current filters. Click "New Receipt" or "New Delivery" above!
                  </td>
                </tr>
              ) : (
                operations.map((op) => {
                  const goodQty = Number(op.total_good_qty) || Number(op.total_done_qty) || 0;
                  const damagedQty = Number(op.total_damaged_qty) || 0;
                  const totalSum = goodQty - damagedQty;

                  return (
                    <tr key={op.id} className="hover:bg-red-50/20 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-red-600">
                        {op.reference_no}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Boxes className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span className="font-bold text-slate-900 text-xs">
                            {op.product_summary || op.product_names || 'Stock Items'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {op.partner_name || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <span className="font-mono text-[11px] text-slate-500">{op.source_location_code}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-mono text-[11px] text-slate-900 font-bold">{op.dest_location_code}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {op.status === 'done' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                +{goodQty} Good
                              </span>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${damagedQty > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                                -{damagedQty} Damaged
                              </span>
                            </div>
                            <div className="text-[11px] font-black text-slate-900 flex items-center gap-1">
                              <span className="text-slate-500 font-medium">Total Sum:</span>
                              <span className="font-mono text-xs text-red-600 font-black">
                                {totalSum} units
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-slate-900 font-bold">
                              <span>Demand: {op.total_demand_qty} units</span>
                            </div>
                            <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                              Pending Good/Damaged Audit
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(op.status)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenDetail(op.id)}
                          className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Operation Detail & Validation Stepper Modal */}
      {isDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsDetailOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingDetail || !selectedOp ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-red-600" />
                Loading order details...
              </div>
            ) : (
              <div className="space-y-5">
                {/* Header & Status Stepper */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-slate-900 font-mono">{selectedOp.reference_no}</span>
                      {getTypeBadge(selectedOp.type)}
                    </div>
                    {getStatusBadge(selectedOp.status)}
                  </div>

                  {/* State Machine Stepper */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                    {['draft', 'waiting', 'ready', 'done'].map((step, idx) => {
                      const isCurrent = selectedOp.status === step;
                      const isPassed = 
                        (step === 'draft') ||
                        (step === 'waiting' && ['waiting', 'ready', 'done'].includes(selectedOp.status)) ||
                        (step === 'ready' && ['ready', 'done'].includes(selectedOp.status)) ||
                        (step === 'done' && selectedOp.status === 'done');

                      return (
                        <React.Fragment key={step}>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isCurrent
                                ? 'bg-red-600 text-white ring-2 ring-red-400/30'
                                : isPassed
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                                : 'bg-slate-200 text-slate-400'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className={`capitalize font-bold ${isCurrent ? 'text-red-600' : isPassed ? 'text-slate-800' : 'text-slate-400'}`}>
                              {step}
                            </span>
                          </div>
                          {idx < 3 && <div className="flex-1 h-0.5 mx-2 bg-slate-200" />}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                    {formError}
                  </div>
                )}

                {/* Document Information Grid */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5 font-medium">Partner / Counterparty</span>
                    <span className="font-bold text-slate-900">{selectedOp.partner_name || 'Internal'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 font-medium">Created By Staff</span>
                    <span className="font-bold text-slate-900">{selectedOp.created_by_name || 'System Staff'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 font-medium">Source Location (From)</span>
                    <span className="font-mono font-bold text-slate-700">{selectedOp.source_location_name} ({selectedOp.source_location_code})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 font-medium">Destination Location (To)</span>
                    <span className="font-mono font-bold text-red-600">{selectedOp.dest_location_name} ({selectedOp.dest_location_code})</span>
                  </div>
                </div>

                {/* Product Workflow & Quality Inspection Section (Good vs Damaged Goods) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-red-600" />
                      <span>Product Workflow & Quality Status Inspection:</span>
                    </h4>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Formula: <span className="text-emerald-700 font-bold">+Good</span> - <span className="text-rose-700 font-bold">Damaged</span> = <span className="text-slate-900 font-black">Total Sum</span>
                    </span>
                  </div>

                  <div className="space-y-3">
                    {selectedOp.items?.map((item) => {
                      const q = qualityCounts[item.id] || { good_qty: item.demand_qty, damaged_qty: 0 };
                      const good = Number(q.good_qty) || 0;
                      const damaged = Number(q.damaged_qty) || 0;
                      const netSum = good - damaged;
                      const isDone = selectedOp.status === 'done';

                      return (
                        <div key={item.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                          {/* Product Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Boxes className="w-4 h-4 text-red-600" />
                              <span className="font-black text-slate-900 text-sm">{item.product_name}</span>
                              <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 text-[10px] font-mono font-bold">
                                {item.product_sku}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 font-medium">
                              Expected Demand: <span className="font-black text-slate-900">{item.demand_qty} {item.product_uom}</span>
                            </div>
                          </div>

                          {/* Quality Status Controls / Breakdown */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Good Products (+count) */}
                            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-emerald-800">
                                  Good Products Arrived:
                                </span>
                                <span className="text-xs font-black text-emerald-600">+count</span>
                              </div>
                              {isDone ? (
                                <div className="text-xl font-black text-emerald-700 font-mono">
                                  +{item.good_qty || item.done_qty} {item.product_uom}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 mt-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={q.good_qty}
                                    onChange={(e) => updateQualityCount(item.id, 'good_qty', e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-emerald-900 font-black text-base focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateQualityCount(item.id, 'good_qty', item.demand_qty)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg transition whitespace-nowrap cursor-pointer"
                                    title="Set all as good"
                                  >
                                    All Good
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Damaged Goods (-count) */}
                            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-bold text-rose-800">
                                  Damaged Goods Arrived:
                                </span>
                                <span className="text-xs font-black text-rose-600">-count</span>
                              </div>
                              {isDone ? (
                                <div className="text-xl font-black text-rose-700 font-mono">
                                  -{item.damaged_qty || 0} {item.product_uom}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 mt-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={q.damaged_qty}
                                    onChange={(e) => updateQualityCount(item.id, 'damaged_qty', e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded-lg text-rose-900 font-black text-base focus:outline-none focus:ring-1 focus:ring-rose-500"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateQualityCount(item.id, 'damaged_qty', 0)}
                                    className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] font-bold rounded-lg transition whitespace-nowrap cursor-pointer"
                                    title="Clear damaged"
                                  >
                                    Zero
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Total Sum Calculation */}
                            <div className="p-3 rounded-xl bg-slate-900 text-white flex flex-col justify-between shadow-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-slate-300">Total Net Sum:</span>
                                <span className="text-[10px] text-slate-400 font-mono">+Good - Bad</span>
                              </div>
                              <div className="mt-1 flex items-baseline gap-1.5">
                                <span className="text-xl font-black text-white font-mono">
                                  {isDone ? ((item.good_qty || item.done_qty) - (item.damaged_qty || 0)) : netSum}
                                </span>
                                <span className="text-xs text-slate-400">{item.product_uom} available</span>
                              </div>
                            </div>
                          </div>

                          {damaged > 0 && !isDone && (
                            <div className="text-[11px] font-medium text-rose-700 bg-rose-50/90 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                              <span>⚠️ Notice: <strong>{damaged} damaged units</strong> will be automatically isolated and booked to Virtual Scrap / Inventory Loss.</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Buttons Toolbar */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setIsDetailOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Close
                  </button>

                  <div className="flex gap-2">
                    {selectedOp.status !== 'done' && selectedOp.status !== 'canceled' && (
                      <button
                        onClick={() => handleCancelOp(selectedOp.id)}
                        disabled={submitting}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
                      >
                        Cancel Order
                      </button>
                    )}

                    {selectedOp.status === 'waiting' && (
                      <button
                        onClick={() => handleCheckAvailability(selectedOp.id)}
                        disabled={submitting}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                        <span>Check Stock Availability</span>
                      </button>
                    )}

                    {selectedOp.status !== 'done' && selectedOp.status !== 'canceled' && (
                      <button
                        onClick={() => handleValidate(selectedOp.id)}
                        disabled={submitting}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/25 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        <span>Validate & Execute Stock Move</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. New Operation Modal */}
      {isNewOpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsNewOpOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-red-600" />
              {opForm.type === 'receipt' ? 'New Receipt (Vendor → Stock)' : opForm.type === 'delivery' ? 'New Delivery Order (Stock → Customer)' : 'New Internal Transfer'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Add products, demand quantities, and target locations.
            </p>

            {formError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateOperation} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {opForm.type === 'receipt' ? 'Supplier / Vendor Name *' : opForm.type === 'delivery' ? 'Customer Name *' : 'Department Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={opForm.partner_name}
                  onChange={(e) => setOpForm({ ...opForm, partner_name: e.target.value })}
                  placeholder={opForm.type === 'receipt' ? 'e.g. Apex Timber & Wood Supplies' : opForm.type === 'delivery' ? 'e.g. Acme Tech Labs' : 'e.g. Production Assembly'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Source Location (From) *</label>
                  <select
                    value={opForm.source_location_id}
                    onChange={(e) => setOpForm({ ...opForm, source_location_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                  >
                    {allLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Destination Location (To) *</label>
                  <select
                    value={opForm.dest_location_id}
                    onChange={(e) => setOpForm({ ...opForm, dest_location_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                  >
                    {allLocations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line items dynamic list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Products & Demand Quantities
                  </label>
                  <button
                    type="button"
                    onClick={addItemLine}
                    className="text-red-600 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {opForm.items.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex-1">
                        <select
                          value={line.product_id}
                          onChange={(e) => updateItemLine(idx, 'product_id', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-red-500 font-medium"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} - {p.name} ({p.current_stock} {p.uom} on hand)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-28">
                        <input
                          type="number"
                          min="1"
                          required
                          value={line.demand_qty}
                          onChange={(e) => updateItemLine(idx, 'demand_qty', e.target.value)}
                          placeholder="Qty"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold text-right focus:outline-none focus:border-red-500"
                        />
                      </div>

                      {opForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemLine(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Instructions</label>
                <textarea
                  rows="2"
                  value={opForm.notes}
                  onChange={(e) => setOpForm({ ...opForm, notes: e.target.value })}
                  placeholder="Optional shipping notes, vendor invoice number..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewOpOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition flex items-center justify-center gap-1 shadow-md shadow-red-500/20 cursor-pointer"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Create Document</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Quick Stock Adjustment Modal */}
      {isAdjustmentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsAdjustmentOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-600" />
              Physical Stock Adjustment
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Fix mismatches between recorded stock and physical floor counts. Automatically adjusts ledger.
            </p>

            {formError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleApplyAdjustment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Product *</label>
                <select
                  value={adjForm.product_id}
                  onChange={(e) => {
                    const prod = products.find(p => p.id === Number(e.target.value));
                    setAdjForm({
                      ...adjForm,
                      product_id: e.target.value,
                      current_stock: prod?.current_stock || 0,
                      counted_qty: prod?.current_stock || 0
                    });
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition font-medium"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Location Rack *</label>
                <select
                  value={adjForm.location_id}
                  onChange={(e) => setAdjForm({ ...adjForm, location_id: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition font-medium"
                >
                  {allLocations.filter(l => l.type === 'internal').map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block text-[11px] mb-1 font-medium">System Recorded Stock:</span>
                  <span className="text-lg font-black text-slate-900 font-mono">{adjForm.current_stock}</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Physical Counted Qty *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={adjForm.counted_qty}
                    onChange={(e) => setAdjForm({ ...adjForm, counted_qty: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-lg font-black focus:outline-none focus:border-red-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Delta preview */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Adjustment Delta:</span>
                <span className={`font-black font-mono text-sm ${
                  Number(adjForm.counted_qty) - Number(adjForm.current_stock) < 0
                    ? 'text-red-600'
                    : Number(adjForm.counted_qty) - Number(adjForm.current_stock) > 0
                    ? 'text-emerald-600'
                    : 'text-slate-600'
                }`}>
                  {Number(adjForm.counted_qty) - Number(adjForm.current_stock) > 0 ? '+' : ''}
                  {Number(adjForm.counted_qty) - Number(adjForm.current_stock)}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason / Scrap Note</label>
                <input
                  type="text"
                  value={adjForm.reason}
                  onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
                  placeholder="e.g. 3 kg steel damaged in transport"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition flex items-center justify-center gap-1 shadow-md shadow-amber-600/20 cursor-pointer"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Apply Adjustment</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
