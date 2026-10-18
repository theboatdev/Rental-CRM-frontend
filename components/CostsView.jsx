'use client';

import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Wrench, Trash2, FileText, X } from 'lucide-react';

export default function CostsView() {
  const { costs, vehicles, addCost, deleteCost, currentUser } = useStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    vehiclePlate: '',
    category: 'Routine Maintenance',
    title: '',
    workshop: '',
    amount: 15000,
    invoiceRef: ''
  });

  const handleOpenAdd = () => {
    if (vehicles.length === 0) return;
    setFormData({
      vehiclePlate: vehicles[0].plateNumber,
      category: 'Routine Maintenance',
      title: '',
      workshop: 'Toyota Lanka Wattala',
      amount: 15000,
      invoiceRef: 'INV-' + Math.floor(10000 + Math.random() * 90000)
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;

    addCost({
      vehiclePlate: formData.vehiclePlate,
      category: formData.category,
      title: formData.title,
      workshop: formData.workshop || 'Authorized Workshop',
      amount: Number(formData.amount),
      invoiceRef: formData.invoiceRef
    });

    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#0A0A0C]/10 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono tracking-widest text-[#FF4F00] uppercase font-bold">
            <span className="w-1.5 h-1.5 bg-[#FF4F00] inline-block"></span>
            <span>WORKSHOP AUDIT // {costs.length} INVOICES RECORDED</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-[#0A0A0C] mt-1">
            Operational Expenses, Service Bills & Invoices
          </h2>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-[#0A0A0C] hover:bg-[#FF4F00] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors flex items-center space-x-2 shadow-sm"
        >
          <Plus size={14} />
          <span>LOG WORKSHOP INVOICE</span>
        </button>
      </div>

      {/* Modernist Costs Table */}
      <div className="border border-[#0A0A0C]/15 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs font-mono">
            <thead className="bg-[#F8F8F9] border-b border-[#0A0A0C]/10 text-left text-[10px] text-[#6E7381] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">DATE</th>
                <th className="px-5 py-3">VEHICLE PLATE</th>
                <th className="px-5 py-3">MAINTENANCE ITEM & CATEGORY</th>
                <th className="px-5 py-3">SERVICE WORKSHOP</th>
                <th className="px-5 py-3 text-center">ATTACHED BILL</th>
                <th className="px-5 py-3 text-right">COST (LKR)</th>
                <th className="px-5 py-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0A0A0C]/10">
              {costs.map((c) => (
                <tr key={c.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-4 text-[#6E7381]">
                    {c.date}
                  </td>
                  <td className="px-5 py-4 font-bold text-[#FF4F00]">
                    {c.vehiclePlate}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-[#0A0A0C]">{c.title}</div>
                    <div className="text-[10px] text-[#6E7381]">{c.category}</div>
                  </td>
                  <td className="px-5 py-4 text-[#0A0A0C]">
                    {c.workshop}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => alert(`Simulated document viewer: Inspecting verified bill ${c.invoiceRef || 'INVOICE'} on AWS S3 secure vault.`)}
                      className="text-[10px] text-[#FF4F00] hover:underline font-bold inline-flex items-center space-x-1"
                    >
                      <FileText size={12} />
                      <span>VIEW BILL</span>
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right font-black text-sm text-rose-700">
                    LKR {Number(c.amount).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {currentUser.role === 'ADMIN' ? (
                      <button
                        onClick={() => {
                          if (confirm('Delete this expense entry? Per-vehicle margin will adjust.')) {
                            deleteCost(c.id);
                          }
                        }}
                        className="text-[#6E7381] hover:text-rose-700 transition-colors p-1"
                        title="Delete cost (Admin only)"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <span className="text-[9px] text-[#6E7381] font-mono">LOCKED</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* LOG COST MODAL */}
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
                  Log Operational Expense Bill
                </h3>
                <button onClick={() => setIsAddModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">
                    Select Vehicle:
                  </label>
                  <select
                    value={formData.vehiclePlate}
                    onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
                    className="w-full p-2 border border-[#0A0A0C]/20 outline-none"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.plateNumber}>
                        {v.plateNumber} — {v.make} {v.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">
                    Expense Category:
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2 border border-[#0A0A0C]/20 outline-none"
                  >
                    <option>Routine Maintenance</option>
                    <option>Mechanical Repair</option>
                    <option>Tire Replacement</option>
                    <option>Commercial Insurance</option>
                    <option>Revenue License & Fitness</option>
                    <option>Fuel & Lubricants</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">
                    Description / Service Rendered:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engine oil change & brake fluid"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-2 border border-[#0A0A0C]/20 outline-none focus:border-[#FF4F00]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">
                      Cost (LKR):
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full p-2 border border-[#0A0A0C]/20 outline-none focus:border-[#FF4F00]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">
                      Workshop / Supplier:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Toyota Lanka"
                      value={formData.workshop}
                      onChange={(e) => setFormData({ ...formData, workshop: e.target.value })}
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
                    Save & Deduct Margin
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
