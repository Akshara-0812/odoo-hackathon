import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Search, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Edit3, 
  Warehouse, 
  X, 
  Sparkles, 
  RefreshCw,
  Scale
} from 'lucide-react';
import api from '../api';

export default function ProductsView() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Wireframe: Search Icon 🔍
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdateStockOpen, setIsUpdateStockOpen] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [breakdownData, setBreakdownData] = useState(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  // Update Stock Form (Wireframe: "User must be able to update the stock from here")
  const [stockUpdateVal, setStockUpdateVal] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category_id: '',
    uom: 'units',
    per_unit_cost: 3000,
    min_stock_alert: 10,
    description: '',
    initial_stock: 0,
    initial_location_id: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/products?search=${encodeURIComponent(search)}`;
      if (selectedCategory) url += `&category_id=${selectedCategory}`;
      if (lowStockOnly) url += `&low_stock=true`;

      const [prodRes, catRes, whRes] = await Promise.all([
        api.get(url),
        api.get('/categories'),
        api.get('/warehouses')
      ]);

      setProducts(prodRes.products || []);
      setCategories(catRes.categories || []);
      setWarehouses(whRes.warehouses || []);
      const internalLocs = (whRes.allLocations || []).filter(l => l.type === 'internal');
      setLocations(internalLocs);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedCategory, lowStockOnly]);

  // Open Update Stock Modal (Wireframe Annotation)
  const handleOpenUpdateStock = (product) => {
    setSelectedProduct(product);
    setStockUpdateVal(product.on_hand);
    setFormError(null);
    setIsUpdateStockOpen(true);
  };

  const handleSaveStockUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post(`/products/${selectedProduct.id}/update-stock`, {
        new_on_hand: Number(stockUpdateVal),
        reason: 'Direct update from Stock table'
      });
      setIsUpdateStockOpen(false);
      await fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Breakdown
  const handleOpenBreakdown = async (product) => {
    setSelectedProduct(product);
    setIsBreakdownOpen(true);
    setLoadingBreakdown(true);
    try {
      const res = await api.get(`/products/${product.id}`);
      setBreakdownData(res.product);
    } catch (err) {
      console.error('Failed to load breakdown:', err);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      category_id: product.category_id || '',
      uom: product.uom,
      per_unit_cost: product.per_unit_cost || 0,
      min_stock_alert: product.min_stock_alert,
      description: product.description || '',
      initial_stock: 0,
      initial_location_id: ''
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const generateSku = () => {
    const prefix = formData.name ? formData.name.substring(0, 3).toUpperCase() : 'SKU';
    const rand = Math.floor(100 + Math.random() * 900);
    setFormData(prev => ({ ...prev, sku: `${prefix}-${rand}` }));
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post('/products', formData);
      setIsCreateOpen(false);
      await fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.put(`/products/${selectedProduct.id}`, formData);
      setIsEditOpen(false);
      await fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header (Wireframe: Title: Stock) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-red-600" />
            Stock
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Real-time on-hand stock and free-to-use availability per product catalog item.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 transition cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Product</span>
        </button>
      </div>

      {/* 2. Wireframe Search Bar with Search Icon 🔍 in Red & White Style */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-wrap items-center gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stock by product name, SKU..."
            className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition"
          />
        </div>

        <div className="w-44">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-red-500 focus:bg-white transition"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
            lowStockOnly
              ? 'bg-amber-50 text-amber-700 border-amber-300'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Low Stock Only</span>
        </button>

        <button
          onClick={fetchData}
          className="p-2 rounded-xl bg-white text-slate-500 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
        </button>
      </div>

      {/* 3. Wireframe Stock Table (Product | per unit cost | On hand | Free to Use) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-5">Product</th>
                <th className="py-3.5 px-5">per unit cost</th>
                <th className="py-3.5 px-5">On hand</th>
                <th className="py-3.5 px-5">Free to Use</th>
                <th className="py-3.5 px-5 text-right">Update Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-red-600" />
                    Loading stock records...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">
                    No products found in stock.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-red-50/30 transition">
                    <td className="py-4 px-5">
                      <div className="font-bold text-sm text-slate-900">{p.name}</div>
                      <span className="font-mono text-[11px] text-red-600 font-semibold">{p.sku}</span>
                    </td>
                    <td className="py-4 px-5 font-bold text-slate-800">
                      {p.per_unit_cost ? `${p.per_unit_cost} Rs` : '—'}
                    </td>
                    <td className="py-4 px-5 font-black text-sm text-slate-900">
                      <span className={p.on_hand <= p.min_stock_alert ? 'text-amber-600' : 'text-slate-900'}>
                        {p.on_hand}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-black text-sm text-red-600 font-mono">
                      {p.free_to_use}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Wireframe Annotation: "User must be able to update the stock from here" */}
                        <button
                          onClick={() => handleOpenUpdateStock(p)}
                          className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Update stock count"
                        >
                          <Scale className="w-3.5 h-3.5" />
                          <span>Update Stock</span>
                        </button>
                        <button
                          onClick={() => handleOpenBreakdown(p)}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition cursor-pointer"
                          title="View Warehouse Locations"
                        >
                          <Warehouse className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Wireframe Annotation Footer */}
        <div className="p-3 bg-red-50/50 border-t border-red-100 text-[11px] text-red-800 font-medium italic text-center">
          * User must be able to update the stock from here (Click "Update Stock" on any row to adjust on-hand units).
        </div>
      </div>

      {/* 4. Update Stock Modal (Wireframe requirement in Red & White) */}
      {isUpdateStockOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsUpdateStockOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <Scale className="w-5 h-5 text-red-600" />
              Update On-Hand Stock
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Update physical count for <strong className="text-slate-800">{selectedProduct.name}</strong>.
            </p>

            {formError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveStockUpdate} className="space-y-4 text-xs">
              <div className="p-3 bg-red-50/60 rounded-2xl border border-red-100 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Current Recorded:</span>
                <span className="text-base font-black text-red-700 font-mono">{selectedProduct.on_hand} {selectedProduct.uom}</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">New On-Hand Count *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stockUpdateVal}
                  onChange={(e) => setStockUpdateVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-base font-bold focus:outline-none focus:border-red-500 focus:bg-white transition"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUpdateStockOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition flex items-center justify-center gap-1 shadow-md shadow-red-500/20 cursor-pointer"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Update Count</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Create Product Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-red-600" />
              Create New Product
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a new item to stock with unit cost, SKU, and opening balance.
            </p>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Desk"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">SKU / Code *</label>
                    <button
                      type="button"
                      onClick={generateSku}
                      className="text-[10px] text-red-600 font-bold hover:text-red-700 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Auto
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g. DSK-001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-red-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Per Unit Cost (Rs) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.per_unit_cost}
                    onChange={(e) => setFormData({ ...formData, per_unit_cost: e.target.value })}
                    placeholder="e.g. 3000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-red-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial On-Hand Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.initial_stock}
                    onChange={(e) => setFormData({ ...formData, initial_stock: e.target.value })}
                    placeholder="e.g. 50"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-red-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit of Measure (UoM)</label>
                  <select
                    value={formData.uom}
                    onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                  >
                    <option value="units">units</option>
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition flex items-center justify-center gap-1 shadow-md shadow-red-500/20 cursor-pointer"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Create Product</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Edit Product Modal */}
      {isEditOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsEditOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-900 mb-4">Edit Product ({selectedProduct.sku})</h3>

            <form onSubmit={handleUpdateProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Per Unit Cost (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.per_unit_cost}
                    onChange={(e) => setFormData({ ...formData, per_unit_cost: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-red-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reorder Alert Min</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-red-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition flex items-center justify-center gap-1 shadow-md shadow-red-500/20 cursor-pointer"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Save Changes</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Location Breakdown Modal */}
      {isBreakdownOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsBreakdownOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-slate-900 mb-1">{selectedProduct.name} - Location Breakdown</h3>
            <p className="text-xs text-slate-500 mb-4">Availability across internal storage shelves</p>

            {loadingBreakdown ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-red-600" />
                Loading...
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {breakdownData?.locations?.map((loc) => (
                  <div key={loc.location_id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{loc.location_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{loc.location_code}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-slate-900">{loc.stock_qty} {selectedProduct.uom}</div>
                      <span className="text-[10px] text-slate-400 font-medium">On hand</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setIsBreakdownOpen(false)}
              className="w-full mt-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
