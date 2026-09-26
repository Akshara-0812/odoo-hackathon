import React, { useState, useEffect, useRef } from 'react';
import { 
  Boxes, 
  ArrowLeftRight, 
  History, 
  LayoutDashboard, 
  Warehouse, 
  Settings, 
  User, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ChevronDown,
  Building2,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  LogOut,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Menu
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthView from './components/AuthView';
import ProfileModal from './components/ProfileModal';
import ProductsView from './components/ProductsView';
import WarehousesView from './components/WarehousesView';
import OperationsView from './components/OperationsView';
import MoveHistoryView from './components/MoveHistoryView';
import DashboardView from './components/DashboardView';
import StockSenseLogo from './components/Logo';
import api from './api';

function DashboardLayout() {
  const { user, logout } = useAuth();
  
  // Navigation tabs: 'dashboard' | 'operations' | 'products' | 'ledger' | 'warehouses' | 'locations' | 'settings'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [operationsType, setOperationsType] = useState('all');
  const [warehouseSubTab, setWarehouseSubTab] = useState('warehouse'); // 'warehouse' | 'location'
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isOpDropdownOpen, setIsOpDropdownOpen] = useState(false);
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const opDropdownRef = useRef(null);
  const settingsDropdownRef = useRef(null);

  const [backendStatus, setBackendStatus] = useState({
    loading: true,
    connected: false,
    data: null,
    error: null,
    pingTimeMs: 0
  });

  const checkBackendHealth = async () => {
    setBackendStatus(prev => ({ ...prev, loading: true, error: null }));
    const startTime = performance.now();
    try {
      const data = await api.get('/health');
      const pingTimeMs = Math.round(performance.now() - startTime);
      setBackendStatus({
        loading: false,
        connected: true,
        data,
        error: null,
        pingTimeMs
      });
    } catch (err) {
      setBackendStatus({
        loading: false,
        connected: false,
        data: null,
        error: err.message,
        pingTimeMs: 0
      });
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (opDropdownRef.current && !opDropdownRef.current.contains(event.target)) {
        setIsOpDropdownOpen(false);
      }
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target)) {
        setIsSettingsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOperationSubmenu = (type) => {
    setOperationsType(type);
    setActiveTab('operations');
    setIsOpDropdownOpen(false);
  };

  const handleSelectSettingsSubmenu = (subTab) => {
    setWarehouseSubTab(subTab);
    setActiveTab('warehouses');
    setIsSettingsDropdownOpen(false);
  };

  // Primary user letter avatar for wireframe: A (User Icon)
  const userLetter = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased overflow-hidden">
      {/* 1. LEFT SIDEBAR (Crisp White with Red Brand Accents & Collapsible Toggle) */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 shadow-sm z-20 transition-all duration-300 ease-in-out`}>
        <div>
          {/* Brand Logo Header & Toggle Button */}
          <div className={`p-4 border-b border-slate-100 flex items-center ${isSidebarCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>
            {!isSidebarCollapsed ? (
              <>
                <StockSenseLogo size="md" />
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <StockSenseLogo size="sm" showText={false} />
                <button
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                  title="Expand Sidebar"
                >
                  <PanelLeftOpen className="w-4 h-4 text-red-600" />
                </button>
              </>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              title={isSidebarCollapsed ? "Dashboard" : undefined}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'} rounded-xl text-xs font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-red-50 text-red-600 border border-red-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-red-600' : 'text-slate-500'}`} />
              {!isSidebarCollapsed && <span>Dashboard</span>}
            </button>

            {/* Operations with Submenu in Sidebar */}
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  setOperationsType('all');
                  setActiveTab('operations');
                }}
                title={isSidebarCollapsed ? "Operations" : undefined}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'operations'
                    ? 'bg-red-50 text-red-600 border border-red-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <ArrowLeftRight className={`w-4 h-4 shrink-0 ${activeTab === 'operations' ? 'text-red-600' : 'text-slate-500'}`} />
                  {!isSidebarCollapsed && <span>Operations</span>}
                </div>
                {!isSidebarCollapsed && <span className="text-[10px] text-slate-400 font-medium">Submenu</span>}
              </button>

              {!isSidebarCollapsed && (
                <div className="pl-7 pr-2 py-1 space-y-1">
                  <button
                    onClick={() => handleSelectOperationSubmenu('receipt')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                      activeTab === 'operations' && operationsType === 'receipt'
                        ? 'text-emerald-700 font-bold bg-emerald-50 border border-emerald-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>1. Receipt</span>
                  </button>
                  <button
                    onClick={() => handleSelectOperationSubmenu('delivery')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                      activeTab === 'operations' && operationsType === 'delivery'
                        ? 'text-red-700 font-bold bg-red-50 border border-red-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>2. Delivery</span>
                  </button>
                  <button
                    onClick={() => handleSelectOperationSubmenu('adjustment')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                      activeTab === 'operations' && operationsType === 'adjustment'
                        ? 'text-amber-700 font-bold bg-amber-50 border border-amber-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>3. Adjustment</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveTab('products')}
              title={isSidebarCollapsed ? "Stock (Available)" : undefined}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-bold transition-all ${
                activeTab === 'products'
                  ? 'bg-red-50 text-red-600 border border-red-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Boxes className={`w-4 h-4 shrink-0 ${activeTab === 'products' ? 'text-red-600' : 'text-slate-500'}`} />
                {!isSidebarCollapsed && <span>Stock</span>}
              </div>
              {!isSidebarCollapsed && <span className="text-[10px] text-slate-400 font-medium">Available</span>}
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              title={isSidebarCollapsed ? "Move History" : undefined}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-bold transition-all ${
                activeTab === 'ledger'
                  ? 'bg-red-50 text-red-600 border border-red-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center space-x-3">
                <History className={`w-4 h-4 shrink-0 ${activeTab === 'ledger' ? 'text-red-600' : 'text-slate-500'}`} />
                {!isSidebarCollapsed && <span>Move History</span>}
              </div>
              {!isSidebarCollapsed && <span className="text-[10px] text-slate-400 font-medium">In/Out</span>}
            </button>

            {/* Warehouse & Locations Sidebar Section */}
            <div className="pt-3 border-t border-slate-100 space-y-1">
              {!isSidebarCollapsed && (
                <div className="px-3.5 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Settings
                </div>
              )}
              <button
                onClick={() => handleSelectSettingsSubmenu('warehouse')}
                title={isSidebarCollapsed ? "1. Warehouse" : undefined}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'space-x-3 px-3.5 py-2'} rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'warehouses' && warehouseSubTab === 'warehouse'
                    ? 'bg-red-50 text-red-600 border border-red-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Building2 className={`w-4 h-4 shrink-0 ${activeTab === 'warehouses' && warehouseSubTab === 'warehouse' ? 'text-red-600' : 'text-slate-500'}`} />
                {!isSidebarCollapsed && <span>1. Warehouse</span>}
              </button>

              <button
                onClick={() => handleSelectSettingsSubmenu('location')}
                title={isSidebarCollapsed ? "2. Locations" : undefined}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2.5' : 'space-x-3 px-3.5 py-2'} rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'warehouses' && warehouseSubTab === 'location'
                    ? 'bg-red-50 text-red-600 border border-red-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Layers className={`w-4 h-4 shrink-0 ${activeTab === 'warehouses' && warehouseSubTab === 'location' ? 'text-red-600' : 'text-slate-500'}`} />
                {!isSidebarCollapsed && <span>2. Locations</span>}
              </button>
            </div>
          </nav>
        </div>

        {/* Profile Card (Left Sidebar Bottom - Sign Out removed from here as per prompt) */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/80">
          <button
            onClick={() => setIsProfileOpen(true)}
            title="User Profile & Settings"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-2' : 'justify-between p-2.5'} rounded-xl bg-white hover:bg-red-50/50 border border-slate-200 shadow-xs transition text-left group`}
          >
            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-3'} min-w-0`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                {userLetter}
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate group-hover:text-red-600 transition">
                    {user?.name}
                  </p>
                  <span className="inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded border text-red-600 bg-red-50 border-red-200">
                    {user?.role}
                  </span>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && <User className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition" />}
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ========================================================================= */}
        {/* TOP NAVBAR (Crisp White + Red Accent Navigation Header) */}
        {/* ========================================================================= */}
        <header className="h-16 bg-white border-b border-slate-200/90 px-4 md:px-6 flex items-center justify-between z-10 shrink-0 shadow-xs">
          {/* Wireframe Header Navigation Tabs & Sidebar Toggle Button */}
          <div className="flex items-center space-x-1.5 md:space-x-2">
            {/* Quick Sidebar Toggle Button */}
            <button
              onClick={() => setIsSidebarCollapsed(prev => !prev)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer mr-1"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Menu className="w-4 h-4 text-slate-700" />
            </button>

            {/* Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'dashboard'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-500/30'
                  : 'text-slate-600 hover:text-red-600 hover:bg-red-50/70'
              }`}
            >
              Dashboard
            </button>

            {/* Operations with Dropdown Submenu */}
            <div className="relative" ref={opDropdownRef}>
              <button
                onClick={() => setIsOpDropdownOpen(!isOpDropdownOpen)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  activeTab === 'operations'
                    ? 'bg-red-600 text-white shadow-sm shadow-red-500/30'
                    : 'text-slate-600 hover:text-red-600 hover:bg-red-50/70'
                }`}
              >
                <span>Operations</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isOpDropdownOpen && (
                <div className="absolute left-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 text-xs animate-fade-in">
                  <div className="px-2.5 py-1 text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100 mb-1">
                    // Operations Submenu
                  </div>
                  <button
                    onClick={() => handleSelectOperationSubmenu('receipt')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium transition"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    <span>1. Receipt</span>
                  </button>
                  <button
                    onClick={() => handleSelectOperationSubmenu('delivery')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-slate-700 hover:bg-red-50 hover:text-red-700 font-medium transition"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-red-600" />
                    <span>2. Delivery</span>
                  </button>
                  <button
                    onClick={() => handleSelectOperationSubmenu('adjustment')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-slate-700 hover:bg-amber-50 hover:text-amber-700 font-medium transition"
                  >
                    <Scale className="w-3.5 h-3.5 text-amber-600" />
                    <span>3. Adjustment</span>
                  </button>
                </div>
              )}
            </div>

            {/* Products / Stock */}
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'products'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-500/30'
                  : 'text-slate-600 hover:text-red-600 hover:bg-red-50/70'
              }`}
              title="List the available stock"
            >
              Products
            </button>

            {/* Move History */}
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'ledger'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-500/30'
                  : 'text-slate-600 hover:text-red-600 hover:bg-red-50/70'
              }`}
              title="Display the history of In/Out stocks"
            >
              Move History
            </button>

            {/* Settings (Warehouse, Locations) */}
            <div className="relative" ref={settingsDropdownRef}>
              <button
                onClick={() => setIsSettingsDropdownOpen(!isSettingsDropdownOpen)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  activeTab === 'warehouses' || activeTab === 'settings'
                    ? 'bg-red-600 text-white shadow-sm shadow-red-500/30'
                    : 'text-slate-600 hover:text-red-600 hover:bg-red-50/70'
                }`}
              >
                <span>Settings</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isSettingsDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 text-xs animate-fade-in">
                  <div className="px-2.5 py-1 text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100 mb-1">
                    // Settings Navigation
                  </div>
                  <button
                    onClick={() => handleSelectSettingsSubmenu('warehouse')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-slate-700 hover:bg-red-50 hover:text-red-600 font-medium transition"
                  >
                    <Building2 className="w-3.5 h-3.5 text-red-600" />
                    <span>1. Warehouse</span>
                  </button>
                  <button
                    onClick={() => handleSelectSettingsSubmenu('location')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-slate-700 hover:bg-red-50 hover:text-red-600 font-medium transition"
                  >
                    <Layers className="w-3.5 h-3.5 text-red-600" />
                    <span>2. Locations</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Header: Status Indicator & A (User Icon) */}
          <div className="flex items-center space-x-3">
            <button
              onClick={checkBackendHealth}
              disabled={backendStatus.loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 border border-slate-200 transition"
              title="Ping Backend API"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${backendStatus.loading ? 'animate-spin text-red-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Ping API</span>
            </button>

            <div className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${
              backendStatus.connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {backendStatus.connected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>API Live ({backendStatus.pingTimeMs}ms)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {/* Wireframe User Icon: A (User Icon in Red & White) */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 border-2 border-white shadow-md ring-2 ring-red-100 flex items-center justify-center text-white font-bold text-sm transition transform hover:scale-105"
              title={`Logged in as ${user?.name || 'User'} (Click for profile)`}
            >
              {userLetter}
            </button>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
          {activeTab === 'dashboard' && <DashboardView onNavigateTab={setActiveTab} />}

          {activeTab === 'operations' && (
            <OperationsView initialType={operationsType} />
          )}

          {activeTab === 'products' && <ProductsView />}

          {activeTab === 'ledger' && <MoveHistoryView />}

          {activeTab === 'warehouses' && (
            <WarehousesView defaultTab={warehouseSubTab} />
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4 max-w-2xl">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-red-600" />
                Settings
              </h3>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-xs shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <div className="font-bold text-sm text-slate-800">1. Warehouse Configuration</div>
                    <div className="text-slate-500">Configure physical fulfillment centers (Name, Short Code, Address)</div>
                  </div>
                  <button
                    onClick={() => handleSelectSettingsSubmenu('warehouse')}
                    className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow-sm transition"
                  >
                    Open Warehouse
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-slate-800">2. Locations Configuration</div>
                    <div className="text-slate-500">Configure internal storage racks (Location Name, Short Code, Warehouse Name)</div>
                  </div>
                  <button
                    onClick={() => handleSelectSettingsSubmenu('location')}
                    className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow-sm transition"
                  >
                    Open Locations
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Profile Modal */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
}

function AuthConsumer() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-500 text-sm">
        <RefreshCw className="w-6 h-6 animate-spin text-red-600 mb-2" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return <DashboardLayout />;
}
