import React, { useState, useEffect } from 'react';
import { 
  Warehouse, 
  MapPin, 
  Plus, 
  Building2, 
  Layers, 
  CheckCircle2, 
  X, 
  RefreshCw,
  Boxes,
  Globe,
  Search
} from 'lucide-react';
import api from '../api';

export default function WarehousesView({ defaultTab = 'warehouse' }) {
  const [activeTab, setActiveTab] = useState(defaultTab); // 'warehouse' | 'location'
  const [warehouses, setWarehouses] = useState([]);
  const [virtualLocations, setVirtualLocations] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search filter
  const [search, setSearch] = useState('');

  // Modals
  const [isAddWhOpen, setIsAddWhOpen] = useState(false);
  const [isAddLocOpen, setIsAddLocOpen] = useState(false);

  // Form states
  // Warehouse Fields: Name, Short Code, Address
  const [whForm, setWhForm] = useState({ name: '', code: '', address: '' });
  // Location Fields: Location Name, Short Code, Warehouse Name (warehouse_id)
  const [locForm, setLocForm] = useState({ warehouse_id: '', name: '', code: '', type: 'internal' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.warehouses || []);
      setVirtualLocations(res.virtualLocations || []);
      setAllLocations(res.allLocations || []);
      if (res.warehouses && res.warehouses.length > 0 && !locForm.warehouse_id) {
        setLocForm(prev => ({ ...prev, warehouse_id: res.warehouses[0].id }));
      }
    } catch (err) {
      console.error('Failed to load warehouses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/warehouses', whForm);
      setIsAddWhOpen(false);
      setWhForm({ name: '', code: '', address: '' });
      await fetchWarehouses();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLocation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/warehouses/locations', locForm);
      setIsAddLocOpen(false);
      setLocForm({ warehouse_id: warehouses[0]?.id || '', name: '', code: '', type: 'internal' });
      await fetchWarehouses();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Flatten locations with warehouse names for the Location table
  const internalLocations = allLocations.filter(l => l.type === 'internal').map(l => {
    const parentWh = warehouses.find(w => w.id === l.warehouse_id);
    return {
      ...l,
      warehouse_name: parentWh ? parentWh.name : 'Main Warehouse'
    };
  });

  const filteredWarehouses = warehouses.filter(w => 
    w.name.toLowerCase().includes(search.toLowerCase()) || 
    w.code.toLowerCase().includes(search.toLowerCase()) ||
    (w.address && w.address.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredLocations = internalLocations.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase()) ||
    (l.warehouse_name && l.warehouse_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation Submenu (1. Warehouse | 2. Locations) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Wireframe Annotation */}
          <div className="text-xs text-red-600 font-bold italic mb-1">
            {activeTab === 'warehouse' 
              ? '* This page contains the warehouse details & location.'
              : '* This page contains the location details.'}
          </div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-red-600" />
            {activeTab === 'warehouse' ? 'Warehouse' : 'Location'}
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Physical fulfillment centers, storage racks, and operational bin locations.
          </p>
        </div>

        {/* Tab switchers matching wireframe: 1. Warehouse, 2. Locations */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
            <button
              onClick={() => setActiveTab('warehouse')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'warehouse'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>1. Warehouse</span>
            </button>
            <button
              onClick={() => setActiveTab('location')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'location'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2. Locations</span>
            </button>
          </div>

          {activeTab === 'warehouse' ? (
            <button
              onClick={() => {
                setError(null);
                setIsAddWhOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Warehouse</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setError(null);
                setLocForm({
                  warehouse_id: warehouses[0]?.id || '',
                  name: '',
                  code: warehouses[0]?.code ? `${warehouses[0].code}/` : '',
                  type: 'internal'
                });
                setIsAddLocOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Location</span>
            </button>
          )}

          <button
            onClick={fetchWarehouses}
            className="p-2 rounded-xl bg-white text-slate-500 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'warehouse' ? "Search warehouses by name, code, or address..." : "Search locations by name, code, or warehouse..."}
            className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. WIREFRAME SCREEN: WAREHOUSE (Title: Warehouse, Fields: Name, Short Code, Address) */}
      {/* ========================================================================= */}
      {activeTab === 'warehouse' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-red-600" />
                Warehouse
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Physical distribution hubs and storage centers</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-bold border border-red-200">
              {filteredWarehouses.length} facilities
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Name</th>
                  <th className="py-3.5 px-5">Short Code</th>
                  <th className="py-3.5 px-5">Address</th>
                  <th className="py-3.5 px-5 text-right">Racks / Bins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-red-600" />
                      Loading warehouses...
                    </td>
                  </tr>
                ) : filteredWarehouses.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-400">
                      No warehouses found. Click "Add Warehouse" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredWarehouses.map((wh) => (
                    <tr key={wh.id} className="hover:bg-red-50/30 transition">
                      <td className="py-4 px-5">
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-red-600 shrink-0" />
                          <span>{wh.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-mono text-sm font-bold text-red-600">
                        {wh.code}
                      </td>
                      <td className="py-4 px-5 text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{wh.address || '—'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => {
                            setActiveTab('location');
                            setSearch(wh.name);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-600 text-xs font-bold border border-slate-200 transition cursor-pointer"
                        >
                          View {wh.locations?.length || 0} Locations
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-red-50/50 border-t border-red-100 text-[11px] text-red-800 font-medium italic text-center">
            * This page contains the warehouse details & location.
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. WIREFRAME SCREEN: LOCATION (Title: Location, Fields: Location Name, Short Code, Warehouse Name) */}
      {/* ========================================================================= */}
      {activeTab === 'location' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-red-600" />
                Location
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Physical aisles, racks, and storage shelves inside warehouses</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-bold border border-red-200">
              {filteredLocations.length} locations
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Location Name</th>
                  <th className="py-3.5 px-5">Short Code</th>
                  <th className="py-3.5 px-5">Warehouse Name</th>
                  <th className="py-3.5 px-5 text-right">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-red-600" />
                      Loading locations...
                    </td>
                  </tr>
                ) : filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-400">
                      No locations found. Click "Add Location" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((loc) => (
                    <tr key={loc.id} className="hover:bg-red-50/30 transition">
                      <td className="py-4 px-5">
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-red-600 shrink-0" />
                          <span>{loc.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-mono text-sm font-bold text-slate-900">
                        {loc.code}
                      </td>
                      <td className="py-4 px-5 font-semibold text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{loc.warehouse_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                          {loc.type}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-red-50/50 border-t border-red-100 text-[11px] text-red-800 font-medium italic text-center">
            * This page contains the location details.
          </div>
        </div>
      )}

      {/* 4. Virtual Double-Entry Locations Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4 text-red-600" />
          <h3 className="text-sm font-bold text-slate-900">Virtual Partner Endpoints (Double-Entry Engine)</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          External counterparties used by StockSense to record incoming vendor intake, customer dispatches, and loss corrections.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {virtualLocations.map((v) => (
            <div key={v.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">{v.name}</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">{v.code}</div>
              </div>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">
                {v.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Add Warehouse Modal (Fields: Name, Short Code, Address) */}
      {isAddWhOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsAddWhOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-red-600" />
              Add Warehouse
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter warehouse details to create a physical distribution hub.
            </p>

            {error && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateWarehouse} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Name: *</label>
                <input
                  type="text"
                  required
                  value={whForm.name}
                  onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
                  placeholder="e.g. Central Warehouse"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Short Code: *</label>
                <input
                  type="text"
                  required
                  value={whForm.code}
                  onChange={(e) => setWhForm({ ...whForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. WH1"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-red-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address: *</label>
                <input
                  type="text"
                  required
                  value={whForm.address}
                  onChange={(e) => setWhForm({ ...whForm, address: e.target.value })}
                  placeholder="e.g. Sector 4, Logistics Park"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddWhOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition flex items-center justify-center gap-1 shadow-md shadow-red-500/20 cursor-pointer"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Save Warehouse</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Add Location Modal (Fields: Location Name, Short Code, Warehouse Name) */}
      {isAddLocOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsAddLocOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <Layers className="w-5 h-5 text-red-600" />
              Add Location
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter location details to configure a rack or shelf inside a warehouse.
            </p>

            {error && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateLocation} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Warehouse Name: *</label>
                <select
                  value={locForm.warehouse_id}
                  onChange={(e) => {
                    const wh = warehouses.find(w => w.id === Number(e.target.value));
                    setLocForm({
                      ...locForm,
                      warehouse_id: e.target.value,
                      code: wh ? `${wh.code}/` : locForm.code
                    });
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Location Name: *</label>
                <input
                  type="text"
                  required
                  value={locForm.name}
                  onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                  placeholder="e.g. Stock/Shelf1"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Short Code: *</label>
                <input
                  type="text"
                  required
                  value={locForm.code}
                  onChange={(e) => setLocForm({ ...locForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. Stock/Shelf1"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-red-500 focus:bg-white transition"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddLocOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition flex items-center justify-center gap-1 shadow-md shadow-red-500/20 cursor-pointer"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Save Location</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
