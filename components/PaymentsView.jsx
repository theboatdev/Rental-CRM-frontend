'use client';

import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CreditCard, Receipt, X, ArrowDownLeft } from 'lucide-react';

export default function PaymentsView() {
  const { payments, rentals, recordPayment } = useStore();
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    rentalCode: '',
    method: 'Cash (LKR)',
    type: 'Rental Settlement',
    amount: 25000
  });

  const handleOpenRecord = () => {
    if (rentals.length === 0) return;
    setFormData({
      rentalCode: rentals[0].code,
      method: 'Cash (LKR)',
      type: 'Rental Settlement',
      amount: 25000
    });
    setIsRecordModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const rental = rentals.find((r) => r.code === formData.rentalCode);
    if (!rental) return;

    try { recordPayment({
      rentalCode: rental.code,
      renterName: rental.renterName,
      method: formData.method,
      type: formData.type,
      amount: Number(formData.amount)
    });

    } catch (err) { alert(err.message); return; }
    setIsRecordModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#0A0A0C]/10 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono tracking-widest text-[#FF4F00] uppercase font-bold">
            <span className="w-1.5 h-1.5 bg-[#FF4F00] inline-block"></span>
            <span>FINANCIAL LEDGER // {payments.length} TRANSACTIONS RECORDED</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-[#0A0A0C] mt-1">
            Cash, Commercial Bank & Card Settlements
          </h2>
        </div>
        <button
          onClick={handleOpenRecord}
          className="px-4 py-2.5 bg-[#0A0A0C] hover:bg-[#FF4F00] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors flex items-center space-x-2 shadow-sm"
        >
          <Plus size={14} />
          <span>RECORD PAYMENT RECEIPT</span>
        </button>
      </div>

      {/* Modernist Ledger Table */}
      <div className="border border-[#0A0A0C]/15 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs font-mono">
            <thead className="bg-[#F8F8F9] border-b border-[#0A0A0C]/10 text-left text-[10px] text-[#6E7381] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">RECEIPT NO</th>
                <th className="px-5 py-3">TRANSACTION DATE</th>
                <th className="px-5 py-3">CLIENT / CONTRACT</th>
                <th className="px-5 py-3">SETTLEMENT METHOD</th>
                <th className="px-5 py-3">TYPE</th>
                <th className="px-5 py-3 text-right">AMOUNT (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0A0A0C]/10">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-4 font-bold text-[#0A0A0C]">
                    {p.receiptNo}
                  </td>
                  <td className="px-5 py-4 text-[#6E7381]">
                    {p.date}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-[#0A0A0C]">{p.renterName}</div>
                    <div className="text-[10px] text-[#FF4F00]">{p.rentalCode}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[10px] bg-white border border-[#0A0A0C]/15 px-2 py-0.5 font-bold text-[#0A0A0C]">
                      {p.method}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#6E7381]">
                    {p.type}
                  </td>
                  <td className="px-5 py-4 text-right font-black text-sm text-emerald-700">
                    LKR {Number(p.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      <AnimatePresence>
        {isRecordModalOpen && (
          <div className="fixed inset-0 z-50 bg-[#0A0A0C]/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#0A0A0C]/20 max-w-md w-full p-6 shadow-2xl relative font-mono text-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#0A0A0C]/10">
                <h3 className="font-bold uppercase tracking-wider text-[#0A0A0C]">
                  Issue Official Payment Receipt
                </h3>
                <button onClick={() => setIsRecordModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">
                    Select Rental Contract:
                  </label>
                  <select
                    value={formData.rentalCode}
                    onChange={(e) => setFormData({ ...formData, rentalCode: e.target.value })}
                    className="w-full p-2 border border-[#0A0A0C]/20 outline-none"
                  >
                    {rentals.filter(r => r.status !== 'CANCELLED').map((r) => (
                      <option key={r.id} value={r.code}>
                        {r.code} — {r.renterName} ({r.vehiclePlate})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">
                    Settlement Method:
                  </label>
                  <select
                    value={formData.method}
                    onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                    className="w-full p-2 border border-[#0A0A0C]/20 outline-none"
                  >
                    <option>Cash (LKR)</option>
                    <option>Bank Transfer (Commercial Bank / Sampath / HNB)</option>
                    <option>Credit Card POS Slip</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">
                    Receipt Classification:
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full p-2 border border-[#0A0A0C]/20 outline-none"
                  >
                    <option>Rental Settlement</option>
                    <option>Security Deposit</option>
                    <option>Advance Booking Deposit</option>
                    <option>Damage Excess Charge</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">
                    Amount Received (LKR):
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full p-2 border border-[#0A0A0C]/20 outline-none focus:border-[#FF4F00]"
                  />
                </div>

                <div className="pt-4 border-t border-[#0A0A0C]/10 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsRecordModalOpen(false)}
                    className="px-4 py-2 border border-[#0A0A0C]/20 text-[#0A0A0C] font-bold uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#FF4F00] hover:bg-[#E04500] text-white font-bold uppercase"
                  >
                    Save & Generate Receipt
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
