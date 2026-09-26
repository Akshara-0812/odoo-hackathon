import React from 'react';
import { User, Mail, Shield, Calendar, LogOut, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-red-500/25">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{user.name}</h3>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 border ${
              user.role === 'Inventory Manager'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {user.role}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6 text-sm">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-slate-500 flex items-center gap-2 text-xs font-medium">
              <Mail className="w-4 h-4 text-slate-400" />
              Work Email:
            </span>
            <span className="font-mono text-slate-900 text-xs font-semibold">{user.email}</span>
          </div>

          <div className="flex items-center justify-between text-slate-700">
            <span className="text-slate-500 flex items-center gap-2 text-xs font-medium">
              <Shield className="w-4 h-4 text-slate-400" />
              Permissions:
            </span>
            <span className="text-xs text-slate-900 font-semibold">
              {user.role === 'Inventory Manager' ? 'Full Approval & Operations' : 'Transfers & Stock Handling'}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-700">
            <span className="text-slate-500 flex items-center gap-2 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Session Status:
            </span>
            <span className="text-xs text-emerald-700 font-bold">Active (JWT Authenticated)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition shadow-md shadow-red-500/20 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
