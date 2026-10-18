'use client';

import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ArrowUpRight, ShieldCheck, Fuel, Wrench, ChevronRight } from 'lucide-react';

export default function DashboardView({ onNavigate }) {
  const { vehicles, rentals, costs, fuelLogs = [] } = useStore();
  const [timeframe, setTimeframe] = useState('30D');

  // Core metrics
  const totalVehicles = vehicles.length;
  const rentedVehicles = vehicles.filter((v) => v.status === 'RENTED').length;
  const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE').length;
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'MAINTENANCE').length;
  const utilizationPct = totalVehicles ? Math.round((rentedVehicles / totalVehicles) * 100) : 0;

  const totalRevenue = rentals.filter(r => ['ACTIVE', 'COMPLETED'].includes(r.status)).reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
  const totalWorkshopCosts = costs.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const totalFuelCosts = fuelLogs.reduce((sum, f) => sum + Number(f.totalCost || 0), 0);
  const totalOperatingCosts = totalWorkshopCosts + totalFuelCosts;
  const netProfit = totalRevenue - totalOperatingCosts;
  const marginPct = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  const totalFuelLiters = fuelLogs.reduce((sum, f) => sum + Number(f.liters || 0), 0);

  // Per-vehicle plot calculations
  const vehicleStats = vehicles.map((v) => {
    const vRentals = rentals.filter((r) => r.vehiclePlate === v.plateNumber && ['ACTIVE', 'COMPLETED'].includes(r.status));
    const vCosts = costs.filter((c) => c.vehiclePlate === v.plateNumber);
    const vFuel = fuelLogs.filter((f) => f.vehiclePlate === v.plateNumber);

    const revenue = vRentals.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
    const workshopCost = vCosts.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const fuelCost = vFuel.reduce((sum, f) => sum + Number(f.totalCost || 0), 0);
    const totalExp = workshopCost + fuelCost;
    const net = revenue - totalExp;
    const fuelLiters = vFuel.reduce((sum, f) => sum + Number(f.liters || 0), 0);

    return {
      ...v,
      revenue,
      workshopCost,
      fuelCost,
      totalExp,
      net,
      fuelLiters,
      rentersCount: vRentals.length
    };
  });

  const maxRevenue = Math.max(...vehicleStats.map((v) => v.revenue), 150000);

  return (
    <div className="space-y-6">
      {/* 1. Compact Architectural Operational Header (Replaced huge FLEET banner) */}
      <div className="border border-[#0A0A0C]/15 bg-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <span className="w-2.5 h-2.5 bg-[#FF4F00] animate-pulse"></span>
          <div>
            <div className="text-[10px] font-mono tracking-widest text-[#FF4F00] uppercase font-bold">
              OPERATIONS PULSE // SRI LANKA FLEET INTELLIGENCE
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0A0A0C]">
              Operational Cashflow & Yield Matrix
            </h1>
          </div>
        </div>

        {/* Timeframe & Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex border border-[#0A0A0C]/15 bg-[#FAFAFA] p-0.5 text-[11px] font-mono font-bold">
            {['7D', '30D', '90D', 'ALL'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 transition-colors ${
                  timeframe === tf ? 'bg-[#0A0A0C] text-white' : 'text-[#6E7381] hover:text-[#0A0A0C]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={() => onNavigate('rentals')}
            className="px-4 py-2 bg-[#FF4F00] hover:bg-[#E04500] text-white text-xs font-mono font-bold tracking-wider uppercase transition-colors flex items-center space-x-1.5"
          >
            <span>DISPATCH RENTAL</span>
            <ArrowUpRight size={13} />
          </button>
        </div>
      </div>

      {/* 2. Top Executive KPI Bar (4 Grid Columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#0A0A0C]/15 p-4 relative">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#6E7381]">
            <span className="uppercase font-bold">FLEET UTILIZATION</span>
            <span className="w-1.5 h-1.5 bg-[#FF4F00]"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-[#0A0A0C]">
              {utilizationPct}%
            </span>
            <span className="text-[10px] font-mono font-bold text-[#FF4F00] bg-[#FFF5F0] px-1.5 py-0.5 border border-[#FF4F00]/20">
              {rentedVehicles}/{totalVehicles} ON ROAD
            </span>
          </div>
          <div className="mt-2.5 w-full bg-[#EAEAEA] h-1.5 overflow-hidden">
            <div className="bg-[#FF4F00] h-full" style={{ width: `${utilizationPct}%` }}></div>
          </div>
        </div>

        <div className="bg-white border border-[#0A0A0C]/15 p-4 relative">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#6E7381]">
            <span className="uppercase font-bold">GROSS CONTRACT REVENUE</span>
            <span className="w-1.5 h-1.5 bg-emerald-600"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
              LKR {totalRevenue.toLocaleString()}
            </span>
          </div>
          <p className="mt-2 text-[10px] font-mono text-[#6E7381]">
            6 vehicles across active & closed leases
          </p>
        </div>

        <div className="bg-white border border-[#0A0A0C]/15 p-4 relative">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#6E7381]">
            <span className="uppercase font-bold">TOTAL OPERATIONAL BURN</span>
            <span className="w-1.5 h-1.5 bg-rose-600"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black font-mono text-rose-700">
              LKR {totalOperatingCosts.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1 py-0.5">
              SERVICE + FUEL
            </span>
          </div>
          <p className="mt-2 text-[10px] font-mono text-[#6E7381]">
            LKR {totalWorkshopCosts.toLocaleString()} repair + LKR {totalFuelCosts.toLocaleString()} fuel
          </p>
        </div>

        <div className="bg-white border border-[#0A0A0C]/15 p-4 relative">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#6E7381]">
            <span className="uppercase font-bold">NET OPERATING MARGIN</span>
            <span className="w-1.5 h-1.5 bg-[#FF4F00]"></span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-[#0A0A0C]">
              LKR {netProfit.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200">
              {marginPct}% MARGIN
            </span>
          </div>
          <div className="mt-2.5 w-full bg-[#EAEAEA] h-1.5 overflow-hidden">
            <div className="bg-emerald-600 h-full" style={{ width: `${Math.max(marginPct, 0)}%` }}></div>
          </div>
        </div>
      </div>

      {/* 3. VISUAL PLOTS ROW: Plot A (Financial Velocity Comparison) & Plot B (Fleet State Radial) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PLOT A: Revenue vs Service Costs vs Fuel Burn (SVG Column Plot) */}
        <div className="lg:col-span-8 border border-[#0A0A0C]/15 bg-white p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#0A0A0C]/10 gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 bg-[#FF4F00] inline-block"></span>
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0A0A0C]">
                  PLOT // Cashflow Velocity & Operational Burn Distribution
                </h3>
              </div>
              <div className="flex items-center space-x-3 text-[10px] font-mono">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 bg-emerald-600 inline-block"></span>
                  <span className="text-[#6E7381]">Revenue</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 bg-amber-500 inline-block"></span>
                  <span className="text-[#6E7381]">Workshop</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 bg-rose-500 inline-block"></span>
                  <span className="text-[#6E7381]">Fuel Burn</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 bg-[#FF4F00] inline-block"></span>
                  <span className="text-[#0A0A0C] font-bold">Net Profit</span>
                </span>
              </div>
            </div>

            {/* Dynamic SVG Plot */}
            <div className="mt-5 relative">
              <svg viewBox="0 0 600 180" className="w-full h-44 sm:h-52 overflow-visible">
                {/* Horizontal Grid lines */}
                <line x1="40" y1="20" x2="590" y2="20" stroke="#0A0A0C" strokeOpacity="0.08" strokeDasharray="3 3" />
                <line x1="40" y1="60" x2="590" y2="60" stroke="#0A0A0C" strokeOpacity="0.08" strokeDasharray="3 3" />
                <line x1="40" y1="100" x2="590" y2="100" stroke="#0A0A0C" strokeOpacity="0.08" strokeDasharray="3 3" />
                <line x1="40" y1="140" x2="590" y2="140" stroke="#0A0A0C" strokeOpacity="0.15" />

                {/* Y-axis labels */}
                <text x="35" y="24" textAnchor="end" fill="#6E7381" fontSize="9" fontFamily="monospace">600K</text>
                <text x="35" y="64" textAnchor="end" fill="#6E7381" fontSize="9" fontFamily="monospace">400K</text>
                <text x="35" y="104" textAnchor="end" fill="#6E7381" fontSize="9" fontFamily="monospace">200K</text>
                <text x="35" y="144" textAnchor="end" fill="#6E7381" fontSize="9" fontFamily="monospace">0</text>

                {/* Bar 1: Gross Revenue */}
                {(() => {
                  const val = totalRevenue;
                  const h = Math.min((val / 600000) * 120, 120);
                  const y = 140 - h;
                  return (
                    <g className="cursor-pointer group">
                      <rect x="75" y={y} width="70" height={h} fill="#10B981" rx="1" />
                      <text x="110" y={y - 6} textAnchor="middle" fill="#10B981" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        {(val / 1000).toFixed(0)}K
                      </text>
                      <text x="110" y="160" textAnchor="middle" fill="#0A0A0C" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        REVENUE
                      </text>
                    </g>
                  );
                })()}

                {/* Bar 2: Workshop Maintenance */}
                {(() => {
                  const val = totalWorkshopCosts;
                  const h = Math.min((val / 600000) * 120, 120);
                  const y = 140 - h;
                  return (
                    <g className="cursor-pointer group">
                      <rect x="195" y={y} width="70" height={h} fill="#F59E0B" rx="1" />
                      <text x="230" y={y - 6} textAnchor="middle" fill="#D97706" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        {(val / 1000).toFixed(0)}K
                      </text>
                      <text x="230" y="160" textAnchor="middle" fill="#0A0A0C" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        WORKSHOP
                      </text>
                    </g>
                  );
                })()}

                {/* Bar 3: Fuel Burn */}
                {(() => {
                  const val = totalFuelCosts;
                  const h = Math.min((val / 600000) * 120, 120);
                  const y = 140 - h;
                  return (
                    <g className="cursor-pointer group">
                      <rect x="315" y={y} width="70" height={h} fill="#EF4444" rx="1" />
                      <text x="350" y={y - 6} textAnchor="middle" fill="#DC2626" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        {(val / 1000).toFixed(0)}K
                      </text>
                      <text x="350" y="160" textAnchor="middle" fill="#0A0A0C" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        FUEL BURN
                      </text>
                    </g>
                  );
                })()}

                {/* Bar 4: Net Fleet Profit */}
                {(() => {
                  const val = netProfit;
                  const h = Math.min((val / 600000) * 120, 120);
                  const y = 140 - h;
                  return (
                    <g className="cursor-pointer group">
                      <rect x="435" y={y} width="80" height={h} fill="#FF4F00" rx="1" />
                      <text x="475" y={y - 6} textAnchor="middle" fill="#FF4F00" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        {(val / 1000).toFixed(0)}K
                      </text>
                      <text x="475" y="160" textAnchor="middle" fill="#FF4F00" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        NET PROFIT
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>

          <div className="pt-3 border-t border-[#0A0A0C]/10 flex flex-wrap items-center justify-between text-[11px] font-mono text-[#6E7381]">
            <span>TOTAL RENTALS: {rentals.length} CONTRACTS</span>
            <span>TOTAL FUEL LOGGED: {totalFuelLiters} L</span>
            <span className="text-[#0A0A0C] font-bold">OPERATING RATIO: {Math.round((totalOperatingCosts / (totalRevenue || 1)) * 100)}%</span>
          </div>
        </div>

        {/* PLOT B: Fleet Status Ring & Yard Breakdown */}
        <div className="lg:col-span-4 border border-[#0A0A0C]/15 bg-white p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-[#0A0A0C]/10">
              <span className="w-2.5 h-2.5 bg-[#0A0A0C] inline-block"></span>
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0A0A0C]">
                PLOT // Fleet Distribution
              </h3>
            </div>

            {/* Circular Architectural Donut Plot */}
            <div className="mt-4 flex items-center justify-center">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {/* Background Track */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#EAEAEA" strokeWidth="14" />
                  
                  {/* On-Road Arc (Rented) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#FF4F00"
                    strokeWidth="14"
                    strokeDasharray={`${(rentedVehicles / totalVehicles) * 251.2} 251.2`}
                    strokeDashoffset="0"
                  />
                  {/* Ready Arc (Available) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#10B981"
                    strokeWidth="14"
                    strokeDasharray={`${(availableVehicles / totalVehicles) * 251.2} 251.2`}
                    strokeDashoffset={`-${(rentedVehicles / totalVehicles) * 251.2}`}
                  />
                  {/* Maintenance Arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#F59E0B"
                    strokeWidth="14"
                    strokeDasharray={`${(maintenanceVehicles / totalVehicles) * 251.2} 251.2`}
                    strokeDashoffset={`-${((rentedVehicles + availableVehicles) / totalVehicles) * 251.2}`}
                  />
                </svg>

                {/* Central Readout */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black font-mono text-[#0A0A0C] leading-none">
                    {totalVehicles}
                  </span>
                  <span className="text-[9px] font-mono text-[#6E7381] uppercase mt-0.5">
                    VEHICLES
                  </span>
                </div>
              </div>
            </div>

            {/* Legend & Count Breakdown */}
            <div className="mt-5 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 border border-[#0A0A0C]/5 bg-[#FAFAFA]">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 bg-[#FF4F00]"></span>
                  <span className="text-[#0A0A0C] font-medium">On-Road Leased</span>
                </div>
                <div className="flex items-center space-x-2 font-bold">
                  <span>{rentedVehicles} Cars</span>
                  <span className="text-[10px] text-[#6E7381]">({Math.round((rentedVehicles / totalVehicles) * 100)}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 border border-[#0A0A0C]/5 bg-[#FAFAFA]">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 bg-emerald-600"></span>
                  <span className="text-[#0A0A0C] font-medium">Yard Ready</span>
                </div>
                <div className="flex items-center space-x-2 font-bold text-emerald-800">
                  <span>{availableVehicles} Cars</span>
                  <span className="text-[10px] text-[#6E7381]">({Math.round((availableVehicles / totalVehicles) * 100)}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 border border-[#0A0A0C]/5 bg-[#FAFAFA]">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 bg-amber-500"></span>
                  <span className="text-[#0A0A0C] font-medium">In Workshop</span>
                </div>
                <div className="flex items-center space-x-2 font-bold text-amber-800">
                  <span>{maintenanceVehicles} Car</span>
                  <span className="text-[10px] text-[#6E7381]">({Math.round((maintenanceVehicles / totalVehicles) * 100)}%)</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('vehicles')}
            className="mt-4 w-full py-2 border border-[#0A0A0C]/20 hover:border-[#FF4F00] text-[#0A0A0C] hover:text-[#FF4F00] text-xs font-mono font-bold tracking-wider uppercase transition-colors flex items-center justify-center space-x-1"
          >
            <span>INSPECT ALL 6 VEHICLES</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* 4. PLOT C: Per-Vehicle Comparative Margin & Burn Matrix (Visual Progress Bars) */}
      <div className="border border-[#0A0A0C]/15 bg-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#0A0A0C]/10 gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-[#FF4F00] inline-block"></span>
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0A0A0C]">
                PLOT // Per-Vehicle Revenue vs Operational Burn Matrix
              </h3>
            </div>
            <p className="text-[11px] text-[#6E7381] font-mono mt-0.5">
              Comparative visual plot: Gross contract yield vs. total workshop & fuel consumption
            </p>
          </div>

          <div className="flex items-center space-x-3 text-[10px] font-mono text-[#6E7381]">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2 bg-emerald-600 inline-block"></span>
              <span>Revenue Yield</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2 bg-rose-500 inline-block"></span>
              <span>Total Burn (Repairs + Fuel)</span>
            </span>
          </div>
        </div>

        {/* Visual Bar Plot Rows for Each of the 6 Scraped Cars */}
        <div className="mt-4 divide-y divide-[#0A0A0C]/10">
          {vehicleStats.map((v) => {
            const revBarWidth = Math.min(Math.round((v.revenue / maxRevenue) * 100), 100);
            const expBarWidth = Math.min(Math.round((v.totalExp / maxRevenue) * 100), 100);

            return (
              <div
                key={v.id}
                onClick={() => onNavigate('vehicles')}
                className="py-3.5 hover:bg-[#FAFAFA] transition-colors cursor-pointer group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  {/* Vehicle Identity */}
                  <div className="w-full md:w-56 shrink-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-[#0A0A0C] group-hover:text-[#FF4F00] transition-colors">
                        {v.plateNumber}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 font-mono font-bold uppercase tracking-wider border ${
                          v.status === 'AVAILABLE'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : v.status === 'RENTED'
                            ? 'border-[#FF4F00]/30 bg-[#FFF5F0] text-[#FF4F00]'
                            : 'border-amber-300 bg-amber-50 text-amber-800'
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-[#6E7381]">
                      {v.make} {v.model} ({v.year})
                    </div>
                  </div>

                  {/* Comparative Visual Bars */}
                  <div className="flex-1 space-y-1.5 max-w-xl">
                    {/* Revenue Bar */}
                    <div className="flex items-center space-x-2 text-[10px] font-mono">
                      <span className="w-12 text-[#6E7381] text-right">REV:</span>
                      <div className="flex-1 bg-[#EAEAEA] h-2.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full transition-all duration-300"
                          style={{ width: `${revBarWidth}%` }}
                        ></div>
                      </div>
                      <span className="w-24 text-right font-bold text-emerald-700">
                        LKR {v.revenue.toLocaleString()}
                      </span>
                    </div>

                    {/* Operational Burn Bar (Workshop + Fuel) */}
                    <div className="flex items-center space-x-2 text-[10px] font-mono">
                      <span className="w-12 text-[#6E7381] text-right">BURN:</span>
                      <div className="flex-1 bg-[#EAEAEA] h-2.5 overflow-hidden">
                        <div
                          className="bg-rose-500 h-full transition-all duration-300"
                          style={{ width: `${expBarWidth}%` }}
                        ></div>
                      </div>
                      <span className="w-24 text-right font-bold text-rose-700">
                        LKR {v.totalExp.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Financial Net Summary */}
                  <div className="w-full md:w-48 text-left md:text-right shrink-0 pt-2 md:pt-0 font-mono">
                    <div className="text-[10px] text-[#6E7381] uppercase">NET CONTRIBUTION</div>
                    <div className={`text-sm font-bold ${v.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      LKR {v.net.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-[#6E7381]">
                      {v.rentersCount} Renters // {v.fuelLiters}L Fuel
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Live Operations Alert & Sri Lanka Tourist Permit Radar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-amber-300 bg-amber-50/60 p-4">
          <div className="flex items-center justify-between font-mono font-bold text-xs text-amber-900">
            <span className="flex items-center space-x-1.5">
              <Wrench size={13} className="text-amber-700" />
              <span>WP KX-9312 // PREMIO</span>
            </span>
            <span className="text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.5">MAINTENANCE</span>
          </div>
          <p className="text-[11px] text-amber-800 mt-2 font-mono leading-relaxed">
            78,500 KM suspension arm bushings & alignment at Toyota Lanka Wattala. Cost: LKR 38,000.
          </p>
        </div>

        <div className="border border-blue-300 bg-blue-50/60 p-4">
          <div className="flex items-center justify-between font-mono font-bold text-xs text-blue-900">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck size={13} className="text-blue-700" />
              <span>DAVID MILLER (SR-0147)</span>
            </span>
            <span className="text-[9px] bg-blue-200 text-blue-900 px-1.5 py-0.5">DMT PERMIT</span>
          </div>
          <p className="text-[11px] text-blue-800 mt-2 font-mono leading-relaxed">
            UK Tourist return due Oct 07. AA Ceylon IDP & DMT BIA permit verified. WP CBF-9201.
          </p>
        </div>

        <div className="border border-[#0A0A0C]/15 bg-white p-4">
          <div className="flex items-center justify-between font-mono font-bold text-xs text-[#0A0A0C]">
            <span className="flex items-center space-x-1.5">
              <Fuel size={13} className="text-[#FF4F00]" />
              <span>FUEL PRICE BENCHMARK</span>
            </span>
            <span className="text-[9px] bg-[#FFF5F0] text-[#FF4F00] px-1.5 py-0.5 font-bold">OCT 2026</span>
          </div>
          <p className="text-[11px] text-[#6E7381] mt-2 font-mono leading-relaxed">
            Current Auto Petrol benchmark: LKR 414 / Liter. Fleet consumption tracked across Ceypetco & Sinopec logs.
          </p>
        </div>
      </div>
    </div>
  );
}

