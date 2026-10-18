'use client';

import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, ArrowUpRight, Wrench, Shield, FileText, X, 
  Users, Gauge, Fuel, Flame, Calendar, DollarSign, CheckCircle2 
} from 'lucide-react';

export default function VehiclesView() {
  const { vehicles, rentals, costs, fuelLogs = [], addVehicle, addCost, addFuelLog } = useStore();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [dossierTab, setDossierTab] = useState('renters'); // 'renters' | 'services' | 'fuel'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Service input state
  const [serviceForm, setServiceForm] = useState({
    category: 'Routine Maintenance',
    title: '',
    workshop: 'Toyota Lanka Wattala',
    amount: '',
    invoiceRef: '',
    odometer: ''
  });

  // New Fuel input state
  const [fuelForm, setFuelForm] = useState({
    liters: '',
    pricePerLiter: 414, // Current Sri Lanka Petrol 92 price
    station: 'Ceypetco Fuel Station, Colombo',
    odometer: ''
  });

  // Vehicle registration form state
  const [formData, setFormData] = useState({
    plateNumber: '',
    make: '',
    model: '',
    year: 2025,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    dailyRateUSD: 65,
    dailyRate: 19500,
    depositAmount: 35000,
    mileage: 20000,
    status: 'AVAILABLE',
    notes: ''
  });

  const handleCreateVehicle = (e) => {
    e.preventDefault();
    if (!formData.plateNumber || !formData.make || !formData.model) return;
    addVehicle(formData);
    setIsAddModalOpen(false);
  };

  const handleAddService = (e, vehiclePlate) => {
    e.preventDefault();
    if (!serviceForm.title || !serviceForm.amount) return;

    addCost({
      vehiclePlate,
      category: serviceForm.category,
      title: serviceForm.title,
      workshop: serviceForm.workshop || 'Authorized Service Center',
      amount: Number(serviceForm.amount),
      invoiceRef: serviceForm.invoiceRef || `INV-${Math.floor(10000 + Math.random() * 90000)}`,
      odometer: Number(serviceForm.odometer) || selectedVehicle?.mileage || 0
    });

    setServiceForm({
      category: 'Routine Maintenance',
      title: '',
      workshop: 'Toyota Lanka Wattala',
      amount: '',
      invoiceRef: '',
      odometer: ''
    });
  };

  const handleAddFuel = (e, vehiclePlate) => {
    e.preventDefault();
    if (!fuelForm.liters) return;

    const liters = Number(fuelForm.liters);
    const price = Number(fuelForm.pricePerLiter) || 414;
    const total = liters * price;

    addFuelLog({
      vehiclePlate,
      liters,
      pricePerLiter: price,
      totalCost: total,
      station: fuelForm.station || 'Ceypetco Fuel Station',
      odometer: Number(fuelForm.odometer) || selectedVehicle?.mileage || 0
    });

    setFuelForm({
      liters: '',
      pricePerLiter: 414,
      station: 'Ceypetco Fuel Station, Colombo',
      odometer: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#0A0A0C]/10 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono tracking-widest text-[#FF4F00] uppercase font-bold">
            <span className="w-1.5 h-1.5 bg-[#FF4F00] inline-block"></span>
            <span>FLEET REPOSITORY // {vehicles.length} UNITS REGISTERED</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-[#0A0A0C] mt-1">
            Vehicle Profiles, Renter History & Operational Burn
          </h2>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-[#0A0A0C] hover:bg-[#FF4F00] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors flex items-center space-x-2 shadow-sm"
        >
          <Plus size={14} />
          <span>REGISTER NEW VEHICLE</span>
        </button>
      </div>

      {/* Grid of Vehicles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((v) => {
          const vRentals = rentals.filter((r) => r.vehiclePlate === v.plateNumber && ['ACTIVE', 'COMPLETED'].includes(r.status));
          const rev = vRentals.reduce((sum, r) => sum + Number(r.totalAmount), 0);
          
          const vCosts = costs.filter((c) => c.vehiclePlate === v.plateNumber);
          const totalCost = vCosts.reduce((sum, c) => sum + Number(c.amount), 0);
          
          const vFuel = fuelLogs.filter((f) => f.vehiclePlate === v.plateNumber);
          const totalFuelCost = vFuel.reduce((sum, f) => sum + Number(f.totalCost), 0);
          const totalFuelLiters = vFuel.reduce((sum, f) => sum + Number(f.liters), 0);
          
          // Burn rate: (Total maintenance + fuel) / 2 active months
          const monthlyBurnRate = Math.round((totalCost + totalFuelCost) / 2);

          // Unique renters
          const uniqueRenters = Array.from(new Set(vRentals.map((r) => r.renterId))).length;
          const net = rev - (totalCost + totalFuelCost);

          return (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-[#0A0A0C]/15 flex flex-col justify-between hover:border-[#FF4F00] transition-colors group"
            >
              <div>
                {/* Image and status overlay */}
                <div className="h-48 bg-slate-900 relative overflow-hidden border-b border-[#0A0A0C]/10">
                  <img
                    src={v.thumbnail}
                    alt={`${v.make} ${v.model}`}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
                  />
                  <div className="absolute top-3 left-3 bg-[#0A0A0C] text-white font-mono text-[11px] font-bold px-2 py-0.5 tracking-wider">
                    {v.plateNumber}
                  </div>
                  <div className="absolute top-3 right-3">
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 font-bold uppercase tracking-wider ${
                        v.status === 'AVAILABLE'
                          ? 'bg-emerald-600 text-white'
                          : v.status === 'RENTED'
                          ? 'bg-[#FF4F00] text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>
                  <div className="absolute bottom-2 right-3 text-white/90 font-mono text-[10px] bg-black/75 px-1.5 py-0.5">
                    {v.transmission} // {v.fuelType}
                  </div>
                </div>

                {/* Specs & Pricing */}
                <div className="p-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-lg text-[#0A0A0C] tracking-tight">
                        {v.make} {v.model} ({v.year})
                      </h3>
                      {v.dailyRateUSD && (
                        <span className="text-[11px] font-mono font-bold text-[#FF4F00] bg-[#FFF5F0] border border-[#FF4F00]/30 px-1.5 py-0.5">
                          ${v.dailyRateUSD} / DAY
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#6E7381] font-mono mt-0.5">
                      TOTAL MILEAGE: {v.mileage.toLocaleString()} KM // DEPOSIT: LKR {v.depositAmount.toLocaleString()}
                    </p>
                  </div>

                  {/* 4-KPI Grid Matrix */}
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#0A0A0C]/10 font-mono text-xs bg-[#FBFBFB] p-2.5">
                    <div>
                      <span className="text-[9px] text-[#6E7381] block uppercase">Unique Renters:</span>
                      <span className="font-bold text-[#0A0A0C] flex items-center space-x-1">
                        <Users size={12} className="text-[#FF4F00]" />
                        <span>{uniqueRenters} Clients ({vRentals.length} Trips)</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#6E7381] block uppercase">Monthly Burn Rate:</span>
                      <span className="font-bold text-rose-700 flex items-center space-x-1">
                        <Flame size={12} className="text-rose-600" />
                        <span>LKR {monthlyBurnRate.toLocaleString()}/mo</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#6E7381] block uppercase">Fuel (This Month):</span>
                      <span className="font-bold text-[#0A0A0C] flex items-center space-x-1">
                        <Fuel size={12} className="text-amber-600" />
                        <span>{totalFuelLiters} L (LKR {totalFuelCost.toLocaleString()})</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#6E7381] block uppercase">Net Profit:</span>
                      <span className={`font-bold ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        LKR {net.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-5 pt-0">
                <button
                  onClick={() => {
                    setSelectedVehicle(v);
                    setDossierTab('renters');
                  }}
                  className="w-full py-2.5 border border-[#0A0A0C]/20 hover:border-[#FF4F00] hover:bg-[#FFF5F0] text-[#0A0A0C] hover:text-[#FF4F00] font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5"
                >
                  <span>VIEW FULL VEHICLE DOSSIER</span>
                  <ArrowUpRight size={13} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* COMPREHENSIVE VEHICLE DOSSIER & HISTORY MODAL */}
      <AnimatePresence>
        {selectedVehicle && (() => {
          const v = selectedVehicle;
          const vRentals = rentals.filter((r) => r.vehiclePlate === v.plateNumber && ['ACTIVE', 'COMPLETED'].includes(r.status));
          const vCosts = costs.filter((c) => c.vehiclePlate === v.plateNumber);
          const vFuel = fuelLogs.filter((f) => f.vehiclePlate === v.plateNumber);

          const totalRev = vRentals.reduce((sum, r) => sum + Number(r.totalAmount), 0);
          const totalServiceCost = vCosts.reduce((sum, c) => sum + Number(c.amount), 0);
          const totalFuelCost = vFuel.reduce((sum, f) => sum + Number(f.totalCost), 0);
          const totalFuelLiters = vFuel.reduce((sum, f) => sum + Number(f.liters), 0);
          const monthlyBurnRate = Math.round((totalServiceCost + totalFuelCost) / 2);
          const net = totalRev - (totalServiceCost + totalFuelCost);

          const totalDistanceDrivenByRenters = vRentals.reduce((sum, r) => sum + (Number(r.mileageDriven) || 0), 0);
          const uniqueRentersCount = Array.from(new Set(vRentals.map((r) => r.renterId))).length;

          return (
            <div className="fixed inset-0 z-50 bg-[#0A0A0C]/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-[#0A0A0C]/20 max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative font-mono text-xs"
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between pb-4 border-b border-[#0A0A0C]/10">
                  <div>
                    <div className="flex items-center space-x-2 text-[10px] text-[#FF4F00] font-bold uppercase">
                      <span>OPERATIONAL VEHICLE DOSSIER</span>
                      <span>//</span>
                      <span>{v.plateNumber}</span>
                      <span>//</span>
                      <span className="text-emerald-700 bg-emerald-50 px-1 border border-emerald-200">
                        {v.status}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-[#0A0A0C] tracking-tight mt-1">
                      {v.make} {v.model} ({v.year})
                    </h3>
                    <p className="text-xs text-[#6E7381] mt-0.5">
                      Transmission: {v.transmission} | Fuel: {v.fuelType} | Standard Rate: ${v.dailyRateUSD}/day (LKR {v.dailyRate.toLocaleString()})
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedVehicle(null)}
                    className="p-1 hover:bg-slate-100 text-[#0A0A0C]"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 5-Metrics High-Visibility Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-[#F8F8F9] border border-[#0A0A0C]/10 mt-5 text-center">
                  <div>
                    <span className="text-[9px] text-[#6E7381] block uppercase font-bold">1. Total Renters</span>
                    <span className="text-sm font-bold text-[#0A0A0C] mt-0.5 block">
                      {uniqueRentersCount} Clients
                    </span>
                    <span className="text-[10px] text-[#6E7381]">{vRentals.length} Contracts</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#6E7381] block uppercase font-bold">2. Total Odometer</span>
                    <span className="text-sm font-bold text-[#0A0A0C] mt-0.5 block">
                      {v.mileage.toLocaleString()} KM
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold">+{totalDistanceDrivenByRenters} KM by renters</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#6E7381] block uppercase font-bold">3. Total Services</span>
                    <span className="text-sm font-bold text-rose-700 mt-0.5 block">
                      LKR {totalServiceCost.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[#6E7381]">{vCosts.length} Invoices</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#6E7381] block uppercase font-bold">4. Monthly Burn Rate</span>
                    <span className="text-sm font-bold text-rose-700 mt-0.5 block">
                      LKR {monthlyBurnRate.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-[#6E7381]">Maintenance + Fuel</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#6E7381] block uppercase font-bold">5. Monthly Fuel</span>
                    <span className="text-sm font-bold text-amber-700 mt-0.5 block">
                      {totalFuelLiters} L
                    </span>
                    <span className="text-[10px] text-[#6E7381]">LKR {totalFuelCost.toLocaleString()}</span>
                  </div>
                </div>

                {/* Sub-Tabs Navigation */}
                <div className="flex border-b border-[#0A0A0C]/10 mt-6 text-xs font-bold uppercase tracking-wider">
                  <button
                    onClick={() => setDossierTab('renters')}
                    className={`px-4 py-3 border-b-2 transition-colors flex items-center space-x-2 ${
                      dossierTab === 'renters'
                        ? 'border-[#FF4F00] text-[#FF4F00] bg-[#FFF5F0]'
                        : 'border-transparent text-[#6E7381] hover:text-[#0A0A0C]'
                    }`}
                  >
                    <Users size={14} />
                    <span>Renter History & Mileage ({vRentals.length})</span>
                  </button>
                  <button
                    onClick={() => setDossierTab('services')}
                    className={`px-4 py-3 border-b-2 transition-colors flex items-center space-x-2 ${
                      dossierTab === 'services'
                        ? 'border-[#FF4F00] text-[#FF4F00] bg-[#FFF5F0]'
                        : 'border-transparent text-[#6E7381] hover:text-[#0A0A0C]'
                    }`}
                  >
                    <Wrench size={14} />
                    <span>Service & Maintenance ({vCosts.length})</span>
                  </button>
                  <button
                    onClick={() => setDossierTab('fuel')}
                    className={`px-4 py-3 border-b-2 transition-colors flex items-center space-x-2 ${
                      dossierTab === 'fuel'
                        ? 'border-[#FF4F00] text-[#FF4F00] bg-[#FFF5F0]'
                        : 'border-transparent text-[#6E7381] hover:text-[#0A0A0C]'
                    }`}
                  >
                    <Fuel size={14} />
                    <span>Monthly Fuel Logs ({vFuel.length})</span>
                  </button>
                </div>

                {/* SUB-TAB 1: RENTER HISTORY & MILEAGE */}
                {dossierTab === 'renters' && (
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[#0A0A0C] uppercase tracking-wider text-xs">
                        Renter History & Distance Driven Breakdown
                      </h4>
                      <span className="text-[10px] text-[#6E7381]">
                        Total Distance by Renters: <strong className="text-[#0A0A0C]">{totalDistanceDrivenByRenters.toLocaleString()} KM</strong>
                      </span>
                    </div>

                    {vRentals.length === 0 ? (
                      <div className="p-6 border border-[#0A0A0C]/10 text-center text-[#6E7381] italic">
                        No previous renters on record for {v.plateNumber}.
                      </div>
                    ) : (
                      <div className="border border-[#0A0A0C]/15 overflow-x-auto">
                        <table className="min-w-full text-xs font-mono">
                          <thead className="bg-[#F8F8F9] border-b border-[#0A0A0C]/10 text-left text-[10px] text-[#6E7381] uppercase">
                            <tr>
                              <th className="px-4 py-2.5">CONTRACT</th>
                              <th className="px-4 py-2.5">RENTER NAME & ID</th>
                              <th className="px-4 py-2.5">RENTAL DATES</th>
                              <th className="px-4 py-2.5 text-right">START ODOMETER</th>
                              <th className="px-4 py-2.5 text-right">END ODOMETER</th>
                              <th className="px-4 py-2.5 text-right">DISTANCE DRIVEN</th>
                              <th className="px-4 py-2.5 text-center">STATUS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#0A0A0C]/10">
                            {vRentals.map((r) => (
                              <tr key={r.id} className="hover:bg-[#FAFAFA]">
                                <td className="px-4 py-3 font-bold text-[#0A0A0C]">{r.code}</td>
                                <td className="px-4 py-3">
                                  <div className="font-bold text-[#0A0A0C]">{r.renterName}</div>
                                  <div className="text-[10px] text-[#FF4F00]">{r.renterId} // {r.renterPhone}</div>
                                </td>
                                <td className="px-4 py-3 text-[#6E7381]">
                                  {r.startDate} → {r.endDate} ({r.days} Days)
                                </td>
                                <td className="px-4 py-3 text-right text-[#0A0A0C]">
                                  {r.startMileage ? `${r.startMileage.toLocaleString()} KM` : 'N/A'}
                                </td>
                                <td className="px-4 py-3 text-right text-[#0A0A0C]">
                                  {r.endMileage ? `${r.endMileage.toLocaleString()} KM` : 'In Progress'}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-emerald-700">
                                  {r.mileageDriven ? `+${r.mileageDriven.toLocaleString()} KM` : 'Active'}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`text-[9px] px-1.5 py-0.2 font-bold uppercase border ${
                                    r.status === 'ACTIVE'
                                      ? 'border-[#FF4F00]/30 bg-[#FFF5F0] text-[#FF4F00]'
                                      : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                  }`}>
                                    {r.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-TAB 2: SERVICE & MAINTENANCE + USER INPUT FORM */}
                {dossierTab === 'services' && (
                  <div className="mt-5 space-y-6">
                    {/* Input Form for New Service */}
                    <div className="border border-[#FF4F00]/30 bg-[#FFF5F0]/40 p-4">
                      <div className="flex items-center space-x-2 text-[10px] font-bold text-[#FF4F00] uppercase tracking-wider mb-2">
                        <Wrench size={13} />
                        <span>Log New Service / Maintenance Entry For {v.plateNumber}</span>
                      </div>
                      <form onSubmit={(e) => handleAddService(e, v.plateNumber)} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[9px] text-[#6E7381] uppercase font-bold mb-1">
                            Service Description (What was done):
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Engine Oil, Oil Filter & Brake Pad Replacement"
                            value={serviceForm.title}
                            onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                            className="w-full p-2 bg-white border border-[#0A0A0C]/20 outline-none focus:border-[#FF4F00]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[#6E7381] uppercase font-bold mb-1">
                            Category:
                          </label>
                          <select
                            value={serviceForm.category}
                            onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                            className="w-full p-2 bg-white border border-[#0A0A0C]/20 outline-none"
                          >
                            <option>Routine Maintenance</option>
                            <option>Brake Service</option>
                            <option>Suspension & Bushing</option>
                            <option>Tire Replacement</option>
                            <option>Battery & Electrical</option>
                            <option>Commercial Insurance</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] text-[#6E7381] uppercase font-bold mb-1">
                            Cost (LKR):
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="18500"
                            value={serviceForm.amount}
                            onChange={(e) => setServiceForm({ ...serviceForm, amount: e.target.value })}
                            className="w-full p-2 bg-white border border-[#0A0A0C]/20 outline-none focus:border-[#FF4F00]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[#6E7381] uppercase font-bold mb-1">
                            Workshop / Center:
                          </label>
                          <input
                            type="text"
                            placeholder="Toyota Lanka Wattala"
                            value={serviceForm.workshop}
                            onChange={(e) => setServiceForm({ ...serviceForm, workshop: e.target.value })}
                            className="w-full p-2 bg-white border border-[#0A0A0C]/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[#6E7381] uppercase font-bold mb-1">
                            Odometer At Service (KM):
                          </label>
                          <input
                            type="number"
                            placeholder={v.mileage.toString()}
                            value={serviceForm.odometer}
                            onChange={(e) => setServiceForm({ ...serviceForm, odometer: e.target.value })}
                            className="w-full p-2 bg-white border border-[#0A0A0C]/20 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-3 flex justify-end">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-[#FF4F00] hover:bg-[#E04500] text-white font-bold uppercase tracking-wider text-[11px]"
                          >
                            Record Service Expense
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Historical List */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-[#0A0A0C] uppercase tracking-wider text-xs">
                        Itemized Maintenance & Workshop Records
                      </h4>
                      {vCosts.length === 0 ? (
                        <div className="p-4 border border-[#0A0A0C]/10 text-center text-[#6E7381] italic">
                          No service records logged yet for {v.plateNumber}.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {vCosts.map((c) => (
                            <div key={c.id} className="p-3 border border-[#0A0A0C]/10 bg-white flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                              <div>
                                <div className="font-bold text-[#0A0A0C] text-sm">{c.title}</div>
                                <div className="text-[10px] text-[#6E7381] mt-0.5">
                                  {c.date} // Category: <span className="font-bold">{c.category}</span> // Workshop: {c.workshop}
                                  {c.odometer && ` // Odometer: ${c.odometer.toLocaleString()} KM`}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-black text-rose-700 text-sm">
                                  LKR {Number(c.amount).toLocaleString()}
                                </div>
                                <span className="text-[9px] text-[#FF4F00] font-bold">VERIFIED WORKSHOP BILL</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SUB-TAB 3: MONTHLY FUEL CONSUMPTION + USER INPUT FORM */}
                {dossierTab === 'fuel' && (
                  <div className="mt-5 space-y-6">
                    {/* Fuel Input Form */}
                    <div className="border border-amber-300 bg-amber-50/40 p-4">
                      <div className="flex items-center space-x-2 text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-2">
                        <Fuel size={13} className="text-amber-600" />
                        <span>Log Fuel Fill-Up For {v.plateNumber}</span>
                      </div>
                      <form onSubmit={(e) => handleAddFuel(e, v.plateNumber)} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[9px] text-[#6E7381] uppercase font-bold mb-1">
                            Liters Pumped (L):
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            required
                            placeholder="e.g. 35.5"
                            value={fuelForm.liters}
                            onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })}
                            className="w-full p-2 bg-white border border-[#0A0A0C]/20 outline-none focus:border-[#FF4F00]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[#6E7381] uppercase font-bold mb-1">
                            Price / Liter (LKR):
                          </label>
                          <input
                            type="number"
                            value={fuelForm.pricePerLiter}
                            onChange={(e) => setFuelForm({ ...fuelForm, pricePerLiter: e.target.value })}
                            className="w-full p-2 bg-white border border-[#0A0A0C]/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[#6E7381] uppercase font-bold mb-1">
                            Filling Station:
                          </label>
                          <input
                            type="text"
                            placeholder="Ceypetco Colombo"
                            value={fuelForm.station}
                            onChange={(e) => setFuelForm({ ...fuelForm, station: e.target.value })}
                            className="w-full p-2 bg-white border border-[#0A0A0C]/20 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-[#6E7381] uppercase font-bold mb-1">
                            Odometer (KM):
                          </label>
                          <input
                            type="number"
                            placeholder={v.mileage.toString()}
                            value={fuelForm.odometer}
                            onChange={(e) => setFuelForm({ ...fuelForm, odometer: e.target.value })}
                            className="w-full p-2 bg-white border border-[#0A0A0C]/20 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-4 flex items-center justify-between pt-2">
                          <div className="text-[11px] font-bold text-[#0A0A0C]">
                            Calculated Cost: LKR {((Number(fuelForm.liters) || 0) * (Number(fuelForm.pricePerLiter) || 414)).toLocaleString()}
                          </div>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-[#0A0A0C] hover:bg-[#FF4F00] text-white font-bold uppercase tracking-wider text-[11px]"
                          >
                            Save Fuel Fill-Up
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Fuel Logs Table */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-[#0A0A0C] uppercase tracking-wider text-xs">
                          Monthly Fuel Fill-Ups & Liters Consumed
                        </h4>
                        <span className="text-[10px] text-[#6E7381]">
                          Total Month Liters: <strong className="text-amber-800 font-bold">{totalFuelLiters} L</strong> (LKR {totalFuelCost.toLocaleString()})
                        </span>
                      </div>

                      {vFuel.length === 0 ? (
                        <div className="p-4 border border-[#0A0A0C]/10 text-center text-[#6E7381] italic">
                          No fuel entries logged yet for {v.plateNumber}.
                        </div>
                      ) : (
                        <div className="border border-[#0A0A0C]/15 overflow-x-auto">
                          <table className="min-w-full text-xs font-mono">
                            <thead className="bg-[#F8F8F9] border-b border-[#0A0A0C]/10 text-left text-[10px] text-[#6E7381] uppercase">
                              <tr>
                                <th className="px-4 py-2.5">DATE</th>
                                <th className="px-4 py-2.5">STATION</th>
                                <th className="px-4 py-2.5 text-right">LITERS PUMPED</th>
                                <th className="px-4 py-2.5 text-right">PRICE / LITER</th>
                                <th className="px-4 py-2.5 text-right">TOTAL FUEL (LKR)</th>
                                <th className="px-4 py-2.5 text-right">ODOMETER</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#0A0A0C]/10">
                              {vFuel.map((f) => (
                                <tr key={f.id} className="hover:bg-[#FAFAFA]">
                                  <td className="px-4 py-3 font-bold text-[#0A0A0C]">{f.date}</td>
                                  <td className="px-4 py-3 text-[#6E7381]">{f.station}</td>
                                  <td className="px-4 py-3 text-right font-bold text-amber-700">{f.liters} L</td>
                                  <td className="px-4 py-3 text-right text-[#6E7381]">Rs. {f.pricePerLiter}</td>
                                  <td className="px-4 py-3 text-right font-bold text-[#0A0A0C]">
                                    LKR {Number(f.totalCost).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-right text-[#6E7381]">
                                    {f.odometer ? `${f.odometer.toLocaleString()} KM` : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* REGISTER NEW VEHICLE MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-[#0A0A0C]/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#0A0A0C]/20 max-w-md w-full p-6 shadow-2xl relative font-mono text-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#0A0A0C]/10">
                <h3 className="font-bold uppercase tracking-wider text-[#0A0A0C]">
                  Register Vehicle To Fleet
                </h3>
                <button onClick={() => setIsAddModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateVehicle} className="mt-4 space-y-3">
                <div>
                  <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">
                    Registration Plate (Sri Lanka):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WP CBA-7821"
                    value={formData.plateNumber}
                    onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 border border-[#0A0A0C]/20 focus:border-[#FF4F00] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">Make:</label>
                    <input
                      type="text"
                      required
                      placeholder="Toyota"
                      value={formData.make}
                      onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                      className="w-full p-2 border border-[#0A0A0C]/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">Model:</label>
                    <input
                      type="text"
                      required
                      placeholder="Raize / Yaris"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full p-2 border border-[#0A0A0C]/20 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">Year:</label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                      className="w-full p-2 border border-[#0A0A0C]/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">Fuel:</label>
                    <select
                      value={formData.fuelType}
                      onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                      className="w-full p-2 border border-[#0A0A0C]/20 outline-none"
                    >
                      <option>Petrol</option>
                      <option>Hybrid</option>
                      <option>Diesel</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">Daily (LKR):</label>
                    <input
                      type="number"
                      value={formData.dailyRate}
                      onChange={(e) => setFormData({ ...formData, dailyRate: Number(e.target.value) })}
                      className="w-full p-2 border border-[#0A0A0C]/20 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#0A0A0C]/10 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-[#0A0A0C]/20 text-[#0A0A0C] font-bold uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#FF4F00] hover:bg-[#E04500] text-white font-bold uppercase"
                  >
                    Commit Vehicle
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
