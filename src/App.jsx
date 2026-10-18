import React, { useState } from 'react';

export default function App() {
  const [currentUser, setCurrentUser] = useState({
    name: 'Dinuka Silva',
    role: 'ADMIN',
    email: 'admin@shenaly.lk'
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white border-b border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center font-bold text-slate-950 text-xl shadow-md">
              S
            </div>
            <div>
              <h1 className="font-bold text-lg">Shenaly Rent a Car</h1>
              <p className="text-xs text-slate-400">Operations & Fleet Portal · Colombo, Sri Lanka</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="text-slate-400">User:</span>
            <span className="font-semibold text-white">{currentUser.name} ({currentUser.role})</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto p-6 flex-1">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-center py-12">
          <h2 className="text-xl font-bold text-slate-900 mb-2">React Admin Portal Scaffolding Ready</h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto mb-6">
            For client presentation and instant interactive testing without a Node build process, open 
            <span className="font-mono bg-slate-100 text-brand-700 px-2 py-1 rounded ml-1 font-semibold">shenaly-rent-a-car-demo.html</span> 
            in any browser.
          </p>
          <div className="inline-flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <span>💡 Includes dummy authentication switcher (Admin / Staff), live photo grids, LKR net profit engine, and WhatsApp generator.</span>
          </div>
        </div>
      </main>
    </div>
  );
}
