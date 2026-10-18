'use client';

import React, { useState, useEffect } from 'react';
import CalendarView from '../components/CalendarView';
import { GuestPortal } from '../components/BookingForms';
import Header from '../components/Header';
import TabNav from '../components/TabNav';
import DashboardView from '../components/DashboardView';
import VehiclesView from '../components/VehiclesView';
import RentersView from '../components/RentersView';
import RentalsView from '../components/RentalsView';
import PaymentsView from '../components/PaymentsView';
import CostsView from '../components/CostsView';
import WhatsAppView from '../components/WhatsAppView';
import { useStore } from '../context/StoreContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function OperationsPortal() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [guestMode, setGuestMode] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setGuestMode(params.get('view') === 'register' || params.get('mode') === 'guest');
    if (params.get('view') === 'calendar') setActiveTab('calendar');
  }, []);
  const { vehicles, renters, rentals, isLoaded } = useStore();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center font-mono text-xs text-[#0A0A0C]">
        <div className="flex items-center space-x-3 border border-[#0A0A0C]/15 bg-white p-6">
          <div className="w-3 h-3 bg-[#FF4F00] animate-pulse"></div>
          <span className="font-bold tracking-widest uppercase">INITIALIZING SHENALY OPERATIONS GRID...</span>
        </div>
      </div>
    );
  }

  if (guestMode) return <main className="max-w-3xl mx-auto p-6 space-y-6"><h1 className="text-2xl font-black">Shenaly Rent a Car · Guest registration</h1><GuestPortal /></main>;

  const counts = {
    vehicles: vehicles.length,
    renters: renters.length,
    rentals: rentals.length,
    reservations: rentals.filter(r => r.status === 'RESERVED').length,
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0C] flex flex-col relative selection:bg-[#FF4F00] selection:text-white">
      {/* Background Architectural Grid Accent */}
      <div className="fixed inset-0 pointer-events-none opacity-30 swiss-grid-bg z-0" />

      {/* Main Structural Components */}
      <div className="relative z-10 flex flex-col flex-1">
        <Header />
        <TabNav activeTab={activeTab} setActiveTab={setActiveTab} counts={counts} />

        {/* Dynamic Animated Tab Views */}
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <DashboardView onNavigate={(tab) => setActiveTab(tab)} />}
              {activeTab === 'vehicles' && <VehiclesView />}
              {activeTab === 'renters' && <RentersView />}
              {activeTab === 'rentals' && <RentalsView onNavigate={setActiveTab} />}
              {activeTab === 'calendar' && <CalendarView />}
              {activeTab === 'payments' && <PaymentsView />}
              {activeTab === 'costs' && <CostsView />}
              {activeTab === 'whatsapp' && <WhatsAppView />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Architectural Footer */}
        <footer className="border-t border-[#0A0A0C]/10 bg-white py-6 mt-12 text-xs font-mono text-[#6E7381]">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-[#FF4F00]"></span>
              <span className="font-bold text-[#0A0A0C]">SHENALY RENT A CAR</span>
              <span>//</span>
              <span>SRI LANKA TOURIST FLEET OPERATIONS</span>
            </div>
            <div>
              COLOMBO DISPATCH // BUILT WITH NEXT.JS & FRAMER MOTION
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
