'use client';

import React from 'react';
import { useStore } from '../context/StoreContext';
import { Shield, UserCheck, RefreshCw, Download, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Header() {
  const { currentUser, switchRole, resetDemoData, exportDataJson } = useStore();

  return (
    <header className="border-b border-[#0A0A0C]/10 bg-white sticky top-0 z-40">
      {/* Top Architectural Measurement Bar */}
      <div className="border-b border-[#FF4F00]/20 bg-[#FFF5F0] px-4 sm:px-8 py-1.5 flex items-center justify-between text-[11px] font-mono tracking-wider text-[#FF4F00]">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5 font-bold">
            <span className="w-1.5 h-1.5 bg-[#FF4F00] inline-block"></span>
            <span>SYSTEM // COLOMBO FLEET DISPATCH</span>
          </span>
          <span className="hidden md:inline text-[#FF4F00]/50">|</span>
          <span className="hidden md:inline text-[#0A0A0C]/60">STANDARD TIME: SLST (+05:30)</span>
          <span className="hidden lg:inline text-[#FF4F00]/50">|</span>
          <span className="hidden lg:inline text-[#0A0A0C]/60">CURRENCY: SRI LANKAN RUPEE (LKR)</span>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              if (confirm('Reset simulated database back to pristine initial state?')) {
                resetDemoData();
              }
            }}
            className="flex items-center space-x-1 text-[#0A0A0C]/60 hover:text-[#FF4F00] transition-colors"
          >
            <RefreshCw size={12} />
            <span>RESET DEMO DATA</span>
          </button>
          <span className="text-[#FF4F00]/30">|</span>
          <button
            onClick={exportDataJson}
            className="flex items-center space-x-1 text-[#0A0A0C]/60 hover:text-[#0A0A0C] transition-colors"
          >
            <Download size={12} />
            <span>EXPORT JSON</span>
          </button>
        </div>
      </div>

      {/* Main Structural Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 min-h-20 py-4 flex flex-wrap gap-4 items-center justify-between">
        {/* Brand & Identity */}
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-[#FF4F00] flex items-center justify-center text-white font-black text-xl tracking-tighter shadow-sm">
            S
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-xl tracking-tighter text-[#0A0A0C] uppercase">Shenaly</span>
              <span className="text-xs font-mono font-bold bg-[#FF4F00] text-white px-1.5 py-0.5 uppercase tracking-widest">
                Rent a Car
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#6E7381] tracking-wide">
              ADMINISTRATION & VEHICLE DISPATCH PORTAL
            </p>
          </div>
        </div>

        <a href="/?view=register" className="text-xs font-mono text-[#FF4F00] underline mx-3">GUEST REGISTRATION</a>

        {/* Dummy Authentication Role Switcher */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="border border-[#0A0A0C]/15 bg-[#F8F8F9] p-1 flex items-center space-x-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#6E7381] px-2 font-semibold">
              DEMO AUTH:
            </span>
            <button
              onClick={() => switchRole('ADMIN')}
              className={`px-3 py-1.5 text-xs font-mono font-bold transition-all relative ${
                currentUser.role === 'ADMIN'
                  ? 'bg-[#FF4F00] text-white shadow-sm'
                  : 'text-[#0A0A0C]/70 hover:text-[#0A0A0C]'
              }`}
            >
              ADMIN // DINUKA
            </button>
            <button
              onClick={() => switchRole('STAFF')}
              className={`px-3 py-1.5 text-xs font-mono font-bold transition-all relative ${
                currentUser.role === 'STAFF'
                  ? 'bg-[#FF4F00] text-white shadow-sm'
                  : 'text-[#0A0A0C]/70 hover:text-[#0A0A0C]'
              }`}
            >
              STAFF // KASUN
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-3 border-l border-[#0A0A0C]/10 pl-4 text-right">
            <div>
              <div className="text-xs font-bold text-[#0A0A0C]">{currentUser.name}</div>
              <div className="text-[10px] font-mono text-[#FF4F00] font-semibold tracking-wider">
                {currentUser.role} ACCESS // {currentUser.badgeNumber}
              </div>
            </div>
            <div className="w-8 h-8 border border-[#FF4F00] flex items-center justify-center font-mono font-bold text-xs bg-[#FFF5F0] text-[#FF4F00]">
              {currentUser.role === 'ADMIN' ? 'AD' : 'OP'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
