import React from 'react';

export default function StockSenseLogo({ size = 'md', showText = true, isWhiteText = false }) {
  // Size presets
  const sizeMap = {
    sm: { icon: 'w-7 h-7', text: 'text-base', badge: 'text-[9px] px-1 py-0.2' },
    md: { icon: 'w-9 h-9', text: 'text-lg', badge: 'text-[10px] px-1.5 py-0.5' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl', badge: 'text-xs px-2 py-0.5' },
    xl: { icon: 'w-16 h-16', text: 'text-3xl', badge: 'text-xs px-2.5 py-1' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className="flex items-center gap-2.5 select-none group">
      {/* Dynamic Red & White Geometric Cube Logo Icon */}
      <div className={`relative ${currentSize.icon} shrink-0 transition-transform duration-300 group-hover:scale-105`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          {/* Subtle Outer Glow */}
          <circle cx="24" cy="24" r="22" fill="#FEF2F2" />
          <circle cx="24" cy="24" r="22" stroke="#FCA5A5" strokeWidth="1.5" strokeDasharray="3 3" />

          {/* Top Face (Crisp Pure White with subtle gradient) */}
          <path
            d="M24 7L39 15.5L24 24L9 15.5L24 7Z"
            fill="url(#topGradient)"
            stroke="#DC2626"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Left Face (Vibrant Ruby Red) */}
          <path
            d="M9 15.5L24 24V41L9 32.5V15.5Z"
            fill="url(#leftGradient)"
            stroke="#B91C1C"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Right Face (Deep Crimson Burgundy) */}
          <path
            d="M24 24L39 15.5V32.5L24 41V24Z"
            fill="url(#rightGradient)"
            stroke="#991B1B"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Stylized Inventory Transit Arrows / Sense Pulse */}
          <path
            d="M17 19.5L24 15.5L31 19.5"
            stroke="#DC2626"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M24 15.5V23"
            stroke="#DC2626"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Central Core Indicator Dot */}
          <circle cx="24" cy="24" r="2.5" fill="#FFFFFF" stroke="#DC2626" strokeWidth="1.5" />

          {/* Gradients Definition */}
          <defs>
            <linearGradient id="topGradient" x1="9" y1="7" x2="39" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#FEE2E2" />
            </linearGradient>
            <linearGradient id="leftGradient" x1="9" y1="15.5" x2="24" y2="41" gradientUnits="userSpaceOnUse">
              <stop stopColor="#EF4444" />
              <stop offset="1" stopColor="#DC2626" />
            </linearGradient>
            <linearGradient id="rightGradient" x1="24" y1="15.5" x2="39" y2="41" gradientUnits="userSpaceOnUse">
              <stop stopColor="#B91C1C" />
              <stop offset="1" stopColor="#991B1B" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight ${currentSize.text} ${isWhiteText ? 'text-white' : 'text-slate-900'}`}>
              Stock<span className="text-red-600">Sense</span>
            </span>
            <span className={`uppercase font-bold tracking-wider rounded-md bg-red-50 text-red-600 border border-red-200/80 shadow-xs ${currentSize.badge}`}>
              IMS
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-500 tracking-normal">
            Modular Inventory System
          </p>
        </div>
      )}
    </div>
  );
}
