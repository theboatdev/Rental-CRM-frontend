'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function TabNav({ activeTab, setActiveTab, counts }) {
  const tabs = [
    { id: 'dashboard', index: '01', label: 'DASHBOARD' },
    { id: 'vehicles', index: '02', label: 'FLEET INVENTORY', count: counts.vehicles },
    { id: 'renters', index: '03', label: 'CLIENT PROFILES', count: counts.renters },
    { id: 'rentals', index: '04', label: 'RENTALS & INSPECTION', count: counts.rentals },
    { id: 'calendar', index: '05', label: 'BOOKING CALENDAR', count: counts.reservations },
    { id: 'payments', index: '06', label: 'PAYMENT LEDGER' },
    { id: 'costs', index: '07', label: 'WORKSHOP COSTS' },
    { id: 'whatsapp', index: '08', label: 'WHATSAPP DIGEST' },
  ];

  return (
    <div className="border-b border-[#0A0A0C]/10 bg-white sticky top-20 z-30 overflow-x-auto no-scrollbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-5 py-4 flex items-center space-x-2 text-xs font-mono tracking-wider transition-colors border-r border-[#0A0A0C]/10 whitespace-nowrap ${
                isActive ? 'text-[#0A0A0C] font-bold bg-[#FAFAFA]' : 'text-[#6E7381] hover:text-[#0A0A0C] hover:bg-[#FDFDFD]'
              }`}
            >
              <span className={`text-[10px] ${isActive ? 'text-[#FF4F00]' : 'text-[#6E7381]'}`}>
                {tab.index}
              </span>
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 border ${
                  isActive ? 'border-[#FF4F00] text-[#FF4F00] bg-[#FFF5F0]' : 'border-slate-300 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4F00]"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
