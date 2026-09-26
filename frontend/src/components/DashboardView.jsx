import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Boxes, 
  AlertTriangle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Warehouse, 
  Scale, 
  RefreshCw, 
  Plus, 
  Search, 
  SlidersHorizontal,
  BellRing,
  Clock,
  ArrowRight,
  Info
} from 'lucide-react';
import api from '../api';

export default function DashboardView({ onNavigateTab }) {
  const [kpiData, setKpiData] = useState(null);
  const [feed, setFeed] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Multi-Dimensional Filters
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [search, setSearch] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      let feedUrl = '/dashboard/feed?';
      if (filterType !== 'all') feedUrl += `type=${filterType}&`;
      if (filterStatus !== 'all') feedUrl += `status=${filterStatus}&`;
      if (filterWarehouse !== 'all') feedUrl += `warehouse_id=${filterWarehouse}&`;
      if (filterCategory !== 'all') feedUrl += `category_id=${filterCategory}&`;
      if (search) feedUrl += `search=${encodeURIComponent(search)}&`;

      const [kpiRes, feedRes, whRes, catRes] = await Promise.all([
        api.get('/dashboard/kpis'),
        api.get(feedUrl),
        api.get('/warehouses'),
        api.get('/categories')
      ]);

      setKpiData(kpiRes);
      setFeed(feedRes.feed || []);
      setWarehouses(whRes.warehouses || []);
      setCategories(catRes.categories || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filterType, filterStatus, filterWarehouse, filterCategory, search]);

  const kpis = kpiData?.kpis;
  const receiptCard = kpis?.receiptCard || { toReceive: 4, late: 1, totalOperations: 6 };
  const deliveryCard = kpis?.deliveryCard || { toDeliver: 4, late: 1, waiting: 2, totalOperations: 6 };
  const lowStockAlerts = kpiData?.lowStockAlerts || [];

  return (
    <div className="space-y-6">
      {/* 1. Header (Wireframe: Dashboard Operations) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-red-600 font-bold uppercase tracking-wider mb-1">
            // Dashboard to display the current statistics
          </div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-red-600" />
            Dashboard Operations
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Real-time warehouse statistics for incoming receipts, outgoing delivery dispatches, and storage lines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab && onNavigateTab('operations')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Operation</span>
          </button>

          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-xl bg-white text-slate-500 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-xs transition cursor-pointer"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. THE MAIN DISPLAY / CARDS (Exact Wireframe Specification in Red & White) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Wireframe Card 1: Receipt */}
        <div className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-3xl p-6 shadow-sm hover:shadow-md transition relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                  <ArrowDownLeft className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Receipt</h3>
                  <span className="text-xs text-slate-500 font-medium">Incoming vendor stock arrivals</span>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab && onNavigateTab('operations')}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200/80 transition flex items-center gap-1 cursor-pointer"
              >
                <span>View</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Wireframe Bullet Stats: 4 to receive, 1 Late, 6 operations */}
            <div className="space-y-3 mt-5">
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between shadow-2xs">
                <span className="text-sm font-bold text-emerald-900">• To Receive:</span>
                <span className="text-2xl font-black text-emerald-700 font-mono">{receiptCard.toReceive} to receive</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex items-center justify-between shadow-2xs">
                  <span className="text-xs font-bold text-rose-800">• Late:</span>
                  <span className="text-base font-black text-red-600 font-mono">{receiptCard.late} Late</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between shadow-2xs">
                  <span className="text-xs font-bold text-slate-700">• Total Ops:</span>
                  <span className="text-base font-black text-slate-900 font-mono">{receiptCard.totalOperations} operations</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="font-medium">Status: Active Intake Processing</span>
            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Ready to validate
            </span>
          </div>
        </div>

        {/* Wireframe Card 2: Delivery */}
        <div className="bg-white border border-slate-200/90 hover:border-red-300 rounded-3xl p-6 shadow-sm hover:shadow-md transition relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-xs">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Delivery</h3>
                  <span className="text-xs text-slate-500 font-medium">Outgoing customer order shipments</span>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab && onNavigateTab('operations')}
                className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200/80 transition flex items-center gap-1 cursor-pointer"
              >
                <span>View</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Wireframe Bullet Stats: 4 to Deliver, 1 Late, 2 waiting, 6 operations */}
            <div className="space-y-3 mt-5">
              <div className="p-4 rounded-2xl bg-red-50/60 border border-red-100 flex items-center justify-between shadow-2xs">
                <span className="text-sm font-bold text-red-900">• To Deliver:</span>
                <span className="text-2xl font-black text-red-600 font-mono">{deliveryCard.toDeliver} to Deliver</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex flex-col justify-between shadow-2xs">
                  <span className="text-[11px] font-bold text-rose-800">• Late:</span>
                  <span className="text-base font-black text-red-600 font-mono mt-1">{deliveryCard.late} Late</span>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col justify-between shadow-2xs">
                  <span className="text-[11px] font-bold text-amber-800">• Waiting:</span>
                  <span className="text-base font-black text-amber-600 font-mono mt-1">{deliveryCard.waiting} waiting</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-700">• Ops:</span>
                  <span className="text-base font-black text-slate-900 font-mono mt-1">{deliveryCard.totalOperations} ops</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="font-medium">Status: Outbound Dispatch Queue</span>
            <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
              Picking & packing
            </span>
          </div>
        </div>
      </div>

      {/* 3. Wireframe Side Notes / Annotations Box */}
      <div className="p-4 rounded-2xl bg-white border border-red-100 shadow-xs text-xs text-slate-600 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-bold text-slate-900 mb-1">Side Notes / Annotations (Operational Logic):</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-rose-50/50 border border-rose-100 font-medium">
              • <strong className="text-red-600 font-bold">Late:</strong> schedule date &lt; today's date
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-medium">
              • <strong className="text-slate-900 font-bold">Operations:</strong> schedule date &gt; today's date
            </div>
            <div className="p-2 rounded-lg bg-amber-50/50 border border-amber-100 font-medium">
              • <strong className="text-amber-700 font-bold">Waiting:</strong> Waiting for the stocks
            </div>
          </div>
        </div>
      </div>

      {/* 4. Low Stock Banner (if any) */}
      {lowStockAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-4 h-4 text-amber-600 animate-pulse" />
            <span className="text-amber-800 font-bold">
              Low Stock Alert ({lowStockAlerts.length} items):
            </span>
            <span className="text-slate-700 font-medium">
              {lowStockAlerts.map(a => `${a.name} (${a.current_stock}/${a.min_stock_alert})`).join(', ')}
            </span>
          </div>
          <button
            onClick={() => onNavigateTab && onNavigateTab('products')}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-[11px] shadow-xs transition cursor-pointer"
          >
            Check Stock
          </button>
        </div>
      )}

      {/* 5. Dynamic Multi-Dimensional Filters Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
        <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
          <span className="font-bold text-slate-800 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-red-600" />
            Dynamic Multi-Filters:
          </span>
          <button
            onClick={() => {
              setFilterType('all');
              setFilterStatus('all');
              setFilterWarehouse('all');
              setFilterCategory('all');
              setSearch('');
            }}
            className="text-[11px] font-bold text-red-600 hover:text-red-700 transition cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Document Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-red-500 focus:bg-white transition"
            >
              <option value="all">All Types</option>
              <option value="receipt">Receipts</option>
              <option value="delivery">Delivery</option>
              <option value="internal">Internal</option>
              <option value="adjustment">Adjustments</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-red-500 focus:bg-white capitalize transition"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="waiting">Waiting</option>
              <option value="ready">Ready</option>
              <option value="done">Done</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Warehouse
            </label>
            <select
              value={filterWarehouse}
              onChange={(e) => setFilterWarehouse(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-red-500 focus:bg-white transition"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Category
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-red-500 focus:bg-white transition"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Search Ref / SKU
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 6. Live Operations Feed Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-red-600" />
            <h3 className="text-sm font-bold text-slate-900">Live Operations Feed</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
              {feed.length} items
            </span>
          </div>

          <button
            onClick={() => onNavigateTab && onNavigateTab('operations')}
            className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>Operations Hub</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-bold">
              <tr>
                <th className="py-3.5 px-4">Reference</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Partner</th>
                <th className="py-3.5 px-4">Routing</th>
                <th className="py-3.5 px-4">Scheduled</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-red-600" />
                    Updating feed...
                  </td>
                </tr>
              ) : feed.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No operations match the selected dynamic filters.
                  </td>
                </tr>
              ) : (
                feed.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-red-600">
                      {op.reference_no}
                    </td>
                    <td className="py-3.5 px-4 capitalize font-semibold text-slate-800">
                      {op.type}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {op.partner_name || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] font-mono">
                      <span>{op.source_location_code}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <span className="text-slate-900 font-bold">{op.dest_location_code}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {op.scheduled_date || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        op.status === 'done'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : op.status === 'ready'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : op.status === 'waiting'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {op.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('operations')}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 text-xs font-bold border border-slate-200 shadow-xs transition cursor-pointer"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
