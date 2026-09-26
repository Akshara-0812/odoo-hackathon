import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Scale, 
  RefreshCw, 
  Boxes, 
  FileText, 
  Calendar, 
  User, 
  TrendingUp, 
  TrendingDown, 
  X,
  Filter,
  CheckCircle2
} from 'lucide-react';
import api from '../api';

export default function MoveHistoryView() {
  const [moves, setMoves] = useState([]);
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');

  // Trail Modal
  const [isTrailOpen, setIsTrailOpen] = useState(false);
  const [trailData, setTrailData] = useState(null);
  const [loadingTrail, setLoadingTrail] = useState(false);
  const [activeTrailProduct, setActiveTrailProduct] = useState(null);

  const fetchMoves = async () => {
    setLoading(true);
    try {
      let url = '/ledger/moves?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (selectedType) url += `type=${selectedType}&`;
      if (selectedProduct) url += `product_id=${selectedProduct}&`;

      const [res, prodRes] = await Promise.all([
        api.get(url),
        api.get('/products')
      ]);

      setMoves(res.moves || []);
      setStats(res.stats || null);
      setProducts(prodRes.products || []);
    } catch (err) {
      console.error('Failed to load moves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoves();
  }, [search, selectedType, selectedProduct]);

  // Open Product Audit Trail
  const handleOpenTrail = async (productId) => {
    setIsTrailOpen(true);
    setLoadingTrail(true);
    try {
      const res = await api.get(`/ledger/trail/${productId}`);
      setTrailData(res);
      setActiveTrailProduct(res.product);
    } catch (err) {
      console.error('Failed to load trail:', err);
    } finally {
      setLoadingTrail(false);
    }
  };

  const getQuantityDisplay = (move) => {
    const isVendor = move.source_location_type === 'vendor';
    const isCustomer = move.dest_location_type === 'customer';
    const isLossDest = move.dest_location_type === 'inventory_loss';
    const isLossSrc = move.source_location_type === 'inventory_loss';

    if (isVendor || isLossSrc) {
      return (
        <span className="text-emerald-700 font-bold font-mono">
          +{move.quantity} <span className="text-slate-400 text-xs font-normal">{move.product_uom}</span>
        </span>
      );
    }
    if (isCustomer || isLossDest) {
      return (
        <span className="text-red-600 font-bold font-mono">
          -{move.quantity} <span className="text-slate-400 text-xs font-normal">{move.product_uom}</span>
        </span>
      );
    }
    return (
      <span className="text-slate-800 font-bold font-mono">
        {move.quantity} <span className="text-slate-400 text-xs font-normal">{move.product_uom}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header (Wireframe: Title: Move History, Search Icon: 🔍) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-red-600" />
            Move History
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Display the history of In/Out stocks across physical racks and partner endpoints.
          </p>
        </div>

        <button
          onClick={() => handleOpenTrail(products[0]?.id || 1)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-red-50 text-slate-800 hover:text-red-600 border border-slate-200 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <TrendingUp className="w-3.5 h-3.5 text-red-600" />
          <span>Product Running Balance Trail</span>
        </button>
      </div>

      {/* 2. Top Stats Overview Cards in Red & White Palette */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Total Ledger Moves</span>
            <History className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.totalMoves ?? moves.length}</div>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Immutable records</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Inbound Receipts</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats?.inboundMoves ?? 0}</div>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Vendor stock additions</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Outbound Deliveries</span>
            <ArrowUpRight className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-600">{stats?.outboundMoves ?? 0}</div>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Customer dispatches</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Internal & Adjustments</span>
            <Scale className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            {(stats?.internalMoves ?? 0) + (stats?.adjustments ?? 0)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Racks shifts & count audits</p>
        </div>
      </div>

      {/* 3. Filters Toolbar with Search Icon 🔍 */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-wrap items-center gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference, product SKU, name, or audit notes..."
            className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition"
          />
        </div>

        {/* Type Filter */}
        <div className="w-44">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-red-500 focus:bg-white transition"
          >
            <option value="">All Operation Types</option>
            <option value="receipt">📥 Receipts Only</option>
            <option value="delivery">📤 Deliveries Only</option>
            <option value="internal">🔄 Internal Transfers</option>
            <option value="adjustment">⚖️ Adjustments Only</option>
          </select>
        </div>

        {/* Product Filter */}
        <div className="w-48">
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-red-500 focus:bg-white transition"
          >
            <option value="">All Products ({products.length})</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} - {p.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchMoves}
          className="p-2 rounded-xl bg-white text-slate-500 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
        </button>
      </div>

      {/* 4. Wireframe Move History Data Table (Product | From | To | Quantity | Status) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">From</th>
                <th className="py-3.5 px-4">To</th>
                <th className="py-3.5 px-4">Quantity</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4 text-right">Trail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-red-600" />
                    Loading audit ledger entries...
                  </td>
                </tr>
              ) : moves.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                moves.map((m) => (
                  <tr key={m.id} className="hover:bg-red-50/30 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{m.product_name}</div>
                      <span className="font-mono text-[11px] text-red-600 font-semibold">{m.product_sku}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      <div className="font-bold text-slate-800">{m.source_location_name}</div>
                      <span className="text-[11px] text-slate-400">{m.source_location_code}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      <div className="font-bold text-slate-900">{m.dest_location_name}</div>
                      <span className="text-[11px] text-slate-400">{m.dest_location_code}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-sm">
                      {getQuantityDisplay(m)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
                        m.status === 'Done'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : m.status === 'Draft'
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {m.status || 'Done'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {m.move_date}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenTrail(m.product_id)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-200 text-[11px] font-bold shadow-2xs transition cursor-pointer"
                        title="View Product Audit Trail"
                      >
                        Trail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Product Audit Trail & Running Balance Drawer/Modal */}
      {isTrailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsTrailOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingTrail || !trailData ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-red-600" />
                Calculating product running balance timeline...
              </div>
            ) : (
              <div className="space-y-5">
                {/* Header with Product Info & Total Stock */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold text-red-600 font-mono">
                      {activeTrailProduct?.sku}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-0.5">{activeTrailProduct?.name}</h3>
                    <p className="text-xs text-slate-500">Step-by-step stock movement progression</p>
                  </div>
                  <div className="text-right p-3 rounded-2xl bg-red-50/60 border border-red-100">
                    <span className="text-[11px] text-slate-500 font-medium block">Current Total Balance</span>
                    <span className="text-2xl font-black text-red-700 font-mono">
                      {trailData.current_stock} {activeTrailProduct?.uom}
                    </span>
                  </div>
                </div>

                {/* Timeline Stepper of Movements */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Progressive Audit Timeline:
                  </h4>
                  <div className="space-y-3">
                    {trailData.trail?.map((step, idx) => (
                      <div
                        key={step.id}
                        className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs ${
                            step.delta > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : step.delta < 0
                              ? 'bg-rose-50 text-red-700 border border-red-200'
                              : 'bg-white text-slate-700 border border-slate-200'
                          }`}>
                            {step.delta > 0 ? '+' : step.delta < 0 ? '-' : '•'}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">{step.reference_no}</span>
                              <span className="text-[11px] text-slate-400">{step.move_date}</span>
                            </div>

                            <div className="text-slate-600 mt-1">
                              <span className="font-mono text-slate-500">{step.source_location_code}</span>
                              <span className="mx-1 text-slate-400">→</span>
                              <span className="font-mono text-slate-900 font-bold">{step.dest_location_code}</span>
                            </div>

                            <p className="text-[11px] text-slate-400 mt-1 italic">{step.notes}</p>
                          </div>
                        </div>

                        {/* Balance Impact */}
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-sm">
                            <span className={step.delta > 0 ? 'text-emerald-600' : step.delta < 0 ? 'text-red-600' : 'text-slate-700'}>
                              {step.delta > 0 ? `+${step.delta}` : step.delta < 0 ? step.delta : '0 (Transfer)'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Balance: <span className="font-bold text-slate-900">{step.running_balance} {activeTrailProduct?.uom}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setIsTrailOpen(false)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close Audit Trail
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
