'use client';

import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Camera, CheckSquare, X, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function RentalsView({ onNavigate }) {
  const { rentals, vehicles, renters, createRental, returnRental } = useStore();
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    vehiclePlate: '',
    renterId: '',
    days: 3,
    depositAmount: 25000,
    startMileage: 40000
  });

  const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE');

  const handleOpenCreate = () => {
    if (availableVehicles.length === 0) {
      alert('All registered vehicles are currently rented or in service.');
      return;
    }
    setFormData({
      vehiclePlate: availableVehicles[0].plateNumber,
      renterId: renters[0]?.profileId || '',
      days: 3,
      depositAmount: availableVehicles[0].depositAmount || 25000,
      startMileage: availableVehicles[0].mileage || 40000
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const vehicle = vehicles.find((v) => v.plateNumber === formData.vehiclePlate);
    const renter = renters.find((r) => r.profileId === formData.renterId);

    if (!vehicle || !renter) return;

    const total = vehicle.dailyRate * Number(formData.days);
    const startDate = new Date().toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + Number(formData.days) * 86400000).toISOString().slice(0, 10);

    try { createRental({
      vehiclePlate: vehicle.plateNumber,
      renterId: renter.profileId,
      renterName: renter.fullName,
      renterPhone: renter.phone,
      days: Number(formData.days),
      dailyRate: vehicle.dailyRate,
      totalAmount: total,
      depositAmount: Number(formData.depositAmount),
      startDate,
      endDate,
      startMileage: Number(formData.startMileage)
    });

    } catch (err) { alert(err.message); return; }
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#0A0A0C]/10 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono tracking-widest text-[#FF4F00] uppercase font-bold">
            <span className="w-1.5 h-1.5 bg-[#FF4F00] inline-block"></span>
            <span>CONTRACT MANAGEMENT // {rentals.length} RECORDS</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-[#0A0A0C] mt-1">
            Rentals, Condition Inspections & Return Tracking
          </h2>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-[#FF4F00] hover:bg-[#E04500] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors flex items-center space-x-2 shadow-sm"
        >
          <Plus size={14} />
          <span>DISPATCH NEW RENTAL</span>
        </button>
      </div>

      {/* Rentals Table */}
      <div className="border border-[#0A0A0C]/15 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs font-mono">
            <thead className="bg-[#F8F8F9] border-b border-[#0A0A0C]/10 text-left text-[10px] text-[#6E7381] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">CONTRACT CODE</th>
                <th className="px-5 py-3">VEHICLE PLATE</th>
                <th className="px-5 py-3">RENTER NAME</th>
                <th className="px-5 py-3">TIMEFRAME</th>
                <th className="px-5 py-3 text-right">TOTAL (LKR)</th>
                <th className="px-5 py-3 text-center">CONDITION INSPECTION</th>
                <th className="px-5 py-3 text-center">STATUS</th>
                <th className="px-5 py-3 text-right">RETURN ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0A0A0C]/10">
              {rentals.map((r) => (
                <tr key={r.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-4 font-bold text-[#0A0A0C]">
                    {r.code}
                  </td>
                  <td className="px-5 py-4 font-bold text-[#FF4F00]">
                    {r.vehiclePlate}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-[#0A0A0C]">{r.renterName}</div>
                    <div className="text-[10px] text-[#6E7381]">{r.renterId}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[#0A0A0C] font-bold">{r.startDate} <span className="text-[#6E7381]">→</span> {r.endDate}</div>
                    <div className="text-[10px] text-[#6E7381]">{r.days} Days @ LKR {r.dailyRate.toLocaleString()}/day</div>
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-[#0A0A0C]">
                    LKR {r.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {r.pickupInspection ? <button
                      onClick={() => setSelectedInspection(r)}
                      className="px-2.5 py-1 border border-[#0A0A0C]/20 hover:border-[#FF4F00] text-[#0A0A0C] hover:text-[#FF4F00] text-[10px] font-bold uppercase transition-colors inline-flex items-center space-x-1"
                    >
                      <Camera size={12} />
                      <span>{r.dropInspection ? '6 PICKUP + 6 DROP' : '6 PICKUP PHOTOS'}</span>
                    </button> : <span className="text-gray-500">Pending handover</span>}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider border ${
                        r.status === 'RESERVED' ? 'border-amber-300 bg-amber-50 text-amber-900' : r.status === 'CANCELLED' ? 'border-gray-300 text-gray-500' : r.status === 'ACTIVE'
                          ? 'border-[#FF4F00]/30 bg-[#FFF5F0] text-[#FF4F00]'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {r.status === 'ACTIVE' ? (
                      <button
                        onClick={() => {
                          if (confirm(`Confirm vehicle return for ${r.vehiclePlate}? 6 return condition photos will be signed off.`)) {
                            returnRental(r.id);
                          }
                        }}
                        className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold uppercase tracking-wider"
                      >
                        RECORD RETURN
                      </button>
                    ) : r.status === 'RESERVED' ? (
                      <button onClick={() => onNavigate?.('calendar')} className="underline text-amber-800">VIEW BOOKING</button>
                    ) : (
                      <span className="text-[10px] text-[#6E7381] font-semibold">{r.status === 'CANCELLED' ? 'CANCELLED' : 'RETURN COMPLETED'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6-ANGLE INSPECTION MODAL */}
      <AnimatePresence>
        {selectedInspection && (
          <div className="fixed inset-0 z-50 bg-[#0A0A0C]/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#0A0A0C]/20 max-w-3xl w-full p-6 shadow-2xl relative font-mono text-xs max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between pb-3 border-b border-[#0A0A0C]/10">
                <div>
                  <span className="text-[10px] text-[#FF4F00] font-bold uppercase">
                    CONDITION VERIFICATION DOSSIER // {selectedInspection.code}
                  </span>
                  <h3 className="text-lg font-black text-[#0A0A0C] mt-0.5">
                    {selectedInspection.vehiclePlate} — {selectedInspection.renterName}
                  </h3>
                </div>
                <button onClick={() => setSelectedInspection(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="p-3 bg-[#F8F8F9] border border-[#0A0A0C]/10 flex flex-col sm:flex-row justify-between text-[11px] gap-2">
                  <div>
                    <span className="text-[#6E7381]">PICKUP TIMESTAMP:</span>{' '}
                    <span className="font-bold text-[#0A0A0C]">{selectedInspection.pickupInspection?.timestamp}</span>
                  </div>
                  <div>
                    <span className="text-[#6E7381]">RETURN STATUS:</span>{' '}
                    <span className="font-bold text-[#FF4F00]">
                      {selectedInspection.dropInspection ? selectedInspection.dropInspection.timestamp : 'ACTIVE ON ROAD'}
                    </span>
                  </div>
                </div>

                {/* 6 Angle Visual Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'ANGLE 01 // FRONT BUMPER', angle: 'Front' },
                    { label: 'ANGLE 02 // REAR TAILGATE', angle: 'Rear' },
                    { label: 'ANGLE 03 // DRIVER PROFILE', angle: 'Driver Side' },
                    { label: 'ANGLE 04 // PASSENGER PROFILE', angle: 'Passenger Side' },
                    { label: 'ANGLE 05 // CABIN & SEATING', angle: 'Interior' },
                    { label: 'ANGLE 06 // ODOMETER READING', angle: 'Dashboard' }
                  ].map((shot, idx) => (
                    <div key={idx} className="border border-[#0A0A0C]/15 bg-[#FAFAFA] p-3 space-y-2">
                      <div className="h-28 bg-[#0A0A0C] flex flex-col items-center justify-center text-white/40 relative">
                        <Camera size={24} />
                        <span className="text-[9px] mt-1 text-white/60">SIMULATED S3 SCAN</span>
                        <span className="absolute bottom-1 right-2 text-[9px] text-white/80 bg-black/60 px-1 font-mono">
                          POINT #{idx + 1}
                        </span>
                      </div>
                      <div>
                        <div className="font-bold text-[#0A0A0C] text-[10px]">{shot.label}</div>
                        <div className="text-[10px] text-emerald-700 font-bold mt-1">✓ Pickup: Passed Zero Marks</div>
                        <div className="text-[10px] text-[#6E7381]">
                          {selectedInspection.dropInspection ? '✓ Drop: Reconciled Unchanged' : 'Drop check awaiting return'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 border border-emerald-300 bg-emerald-50 text-emerald-950 text-[11px] leading-relaxed">
                  <span className="font-bold">Sri Lanka Damage Waiver Protocol:</span> Digital condition timestamps eliminate dispute exposures with foreign tourists and preserve hire-insurance deductibles.
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DISPATCH MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-[#0A0A0C]/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#0A0A0C]/20 max-w-md w-full p-6 shadow-2xl relative font-mono text-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#0A0A0C]/10">
                <h3 className="font-bold uppercase tracking-wider text-[#0A0A0C]">
                  Issue Rental Dispatch Contract
                </h3>
                <button onClick={() => setIsCreateModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">
                    Select Available Vehicle:
                  </label>
                  <select
                    value={formData.vehiclePlate}
                    onChange={(e) => {
                      const v = vehicles.find((item) => item.plateNumber === e.target.value);
                      setFormData({
                        ...formData,
                        vehiclePlate: e.target.value,
                        depositAmount: v?.depositAmount || 25000,
                        startMileage: v?.mileage || 40000
                      });
                    }}
                    className="w-full p-2 border border-[#0A0A0C]/20 outline-none"
                  >
                    {availableVehicles.map((v) => (
                      <option key={v.id} value={v.plateNumber}>
                        {v.plateNumber} — {v.make} {v.model} (LKR {v.dailyRate.toLocaleString()}/day)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">
                    Select Client Profile:
                  </label>
                  <select
                    value={formData.renterId}
                    onChange={(e) => setFormData({ ...formData, renterId: e.target.value })}
                    className="w-full p-2 border border-[#0A0A0C]/20 outline-none"
                  >
                    {renters.map((r) => (
                      <option key={r.id} value={r.profileId}>
                        {r.profileId} — {r.fullName} ({r.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">Days:</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.days}
                      onChange={(e) => setFormData({ ...formData, days: e.target.value })}
                      className="w-full p-2 border border-[#0A0A0C]/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">Security Deposit (LKR):</label>
                    <input
                      type="number"
                      value={formData.depositAmount}
                      onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                      className="w-full p-2 border border-[#0A0A0C]/20 outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#F8F8F9] border border-[#0A0A0C]/10 flex justify-between font-bold text-sm">
                  <span>Calculated Contract Total:</span>
                  <span className="text-[#FF4F00]">
                    LKR{' '}
                    {(
                      (vehicles.find((v) => v.plateNumber === formData.vehiclePlate)?.dailyRate || 0) *
                      Number(formData.days)
                    ).toLocaleString()}
                  </span>
                </div>

                <div className="pt-4 border-t border-[#0A0A0C]/10 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 border border-[#0A0A0C]/20 text-[#0A0A0C] font-bold uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#FF4F00] hover:bg-[#E04500] text-white font-bold uppercase"
                  >
                    Authorize Contract
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
