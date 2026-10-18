'use client';

import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, ShieldCheck, FileCheck, X, Eye } from 'lucide-react';

export default function RentersView() {
  const { renters, addRenter } = useStore();
  const [selectedRenter, setSelectedRenter] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    isTourist: false,
    country: 'Sri Lanka',
    address: '',
    docType: 'National Identity Card (NIC)',
    docNumber: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.docNumber) return;

    addRenter({
      fullName: formData.fullName,
      phone: formData.phone,
      email: formData.email,
      isTourist: formData.isTourist,
      country: formData.country,
      address: formData.address,
      documents: [
        {
          type: formData.docType,
          number: formData.docNumber,
          verified: true
        }
      ]
    });

    setIsAddModalOpen(false);
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      isTourist: false,
      country: 'Sri Lanka',
      address: '',
      docType: 'National Identity Card (NIC)',
      docNumber: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#0A0A0C]/10 gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono tracking-widest text-[#FF4F00] uppercase font-bold">
            <span className="w-1.5 h-1.5 bg-[#FF4F00] inline-block"></span>
            <span>CLIENT REGISTRY // {renters.length} PROFILES DOCUMENTED</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-[#0A0A0C] mt-1">
            Renter Verification & Sri Lanka DMT Compliance
          </h2>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-[#0A0A0C] hover:bg-[#FF4F00] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors flex items-center space-x-2 shadow-sm"
        >
          <Plus size={14} />
          <span>REGISTER CLIENT PROFILE</span>
        </button>
      </div>

      {/* Modernist Table */}
      <div className="border border-[#0A0A0C]/15 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs font-mono">
            <thead className="bg-[#F8F8F9] border-b border-[#0A0A0C]/10 text-left text-[10px] text-[#6E7381] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">PROFILE ID</th>
                <th className="px-5 py-3">RENTER NAME & CONTACT</th>
                <th className="px-5 py-3">ORIGIN / CLASSIFICATION</th>
                <th className="px-5 py-3">LEGAL COMPLIANCE DOCUMENTS</th>
                <th className="px-5 py-3 text-center">RENTALS</th>
                <th className="px-5 py-3 text-right">DOSSIER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0A0A0C]/10">
              {renters.map((r) => (
                <tr key={r.id} className="hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-5 py-4 font-bold text-[#FF4F00]">
                    {r.profileId}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-[#0A0A0C] text-sm">{r.fullName}</div>
                    {r.source && <div className="text-[10px] text-amber-800">{r.source}</div>}
                    <div className="text-[11px] text-[#6E7381]">{r.phone}</div>
                    <div className="text-[10px] text-[#6E7381]">{r.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider border ${
                        r.isTourist
                          ? 'border-purple-300 bg-purple-50 text-purple-900'
                          : 'border-slate-300 bg-slate-100 text-slate-800'
                      }`}
                    >
                      {r.isTourist ? `TOURIST (${r.country})` : 'RESIDENT (SRI LANKA)'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5 max-w-md">
                      {r.documents.map((doc, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center space-x-1 text-[10px] bg-white border border-[#0A0A0C]/15 px-2 py-0.5 text-[#0A0A0C]"
                        >
                          <span className={`w-1.5 h-1.5 inline-block ${doc.verified ? 'bg-emerald-600' : 'bg-amber-500'}`}></span>
                          <span className="font-bold">{doc.type}:</span>
                          <span className="text-[#6E7381]">{doc.number}{!doc.verified && ' · Pending verification'}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center font-bold text-sm text-[#0A0A0C]">
                    {r.rentalsCount || 0}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setSelectedRenter(r)}
                      className="px-3 py-1.5 border border-[#0A0A0C]/20 hover:border-[#FF4F00] hover:bg-[#FFF5F0] text-[#0A0A0C] hover:text-[#FF4F00] text-[10px] font-bold uppercase transition-colors inline-flex items-center space-x-1"
                    >
                      <Eye size={12} />
                      <span>INSPECT</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RENTER DOSSIER MODAL */}
      <AnimatePresence>
        {selectedRenter && (
          <div className="fixed inset-0 z-50 bg-[#0A0A0C]/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#0A0A0C]/20 max-w-xl w-full p-6 shadow-2xl relative font-mono text-xs"
            >
              <div className="flex items-start justify-between pb-3 border-b border-[#0A0A0C]/10">
                <div>
                  <span className="text-[10px] text-[#FF4F00] font-bold uppercase">
                    CLIENT VERIFICATION DOSSIER // {selectedRenter.profileId}
                  </span>
                  <h3 className="text-lg font-black text-[#0A0A0C] mt-0.5">
                    {selectedRenter.fullName}
                  </h3>
                </div>
                <button onClick={() => setSelectedRenter(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="p-3 bg-[#F8F8F9] border border-[#0A0A0C]/10 space-y-1">
                  <div><span className="text-[#6E7381]">CONTACT:</span> <span className="font-bold text-[#0A0A0C]">{selectedRenter.phone}</span></div>
                  <div><span className="text-[#6E7381]">EMAIL:</span> <span className="text-[#0A0A0C]">{selectedRenter.email}</span></div>
                  <div><span className="text-[#6E7381]">STATED ADDRESS:</span> <span className="text-[#0A0A0C]">{selectedRenter.address}</span></div>
                </div>

                {selectedRenter.emergencyContact && <div className="p-3 border text-xs"><strong>Emergency contact:</strong> {selectedRenter.emergencyContact.name} · {selectedRenter.emergencyContact.phone} · {selectedRenter.emergencyContact.relationship}</div>}
                <div>
                  <h4 className="font-bold text-[#0A0A0C] uppercase tracking-wider mb-2">
                    Identification Documents (Demo Records)
                  </h4>
                  <div className="space-y-2">
                    {selectedRenter.documents.map((doc, idx) => (
                      <div key={idx} className="p-3 border border-emerald-300 bg-emerald-50/50 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ShieldCheck size={16} className="text-emerald-700" />
                          <div>
                            <div className="font-bold text-[#0A0A0C]">{doc.type}</div>
                            <div className="text-[10px] text-[#6E7381]">DOCUMENT REF: {doc.number}</div>
                          </div>
                        </div>
                        <span className="text-[9px] bg-emerald-600 text-white font-bold px-2 py-0.5">
                          {doc.verified ? 'VERIFIED' : 'PENDING VERIFICATION'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-[#6E7381]">
                  Compliance Notice: Foreign tourist permits verified in accordance with Sri Lanka Tourism Development Authority (SLTDA) & Department of Motor Traffic regulations.
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD RENTER MODAL */}
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
                  Register New Client Profile
                </h3>
                <button onClick={() => setIsAddModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">Full Legal Name:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ruwan Jayasuriya"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full p-2 border border-[#0A0A0C]/20 outline-none focus:border-[#FF4F00]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">Phone Number:</label>
                    <input
                      type="text"
                      required
                      placeholder="+94 77 000 0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-2 border border-[#0A0A0C]/20 outline-none focus:border-[#FF4F00]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">Client Type:</label>
                    <select
                      value={formData.isTourist ? 'tourist' : 'local'}
                      onChange={(e) => {
                        const isT = e.target.value === 'tourist';
                        setFormData({
                          ...formData,
                          isTourist: isT,
                          country: isT ? 'International' : 'Sri Lanka',
                          docType: isT ? 'Passport (Foreign Tourist)' : 'National Identity Card (NIC)'
                        });
                      }}
                      className="w-full p-2 border border-[#0A0A0C]/20 outline-none"
                    >
                      <option value="local">Sri Lanka Resident</option>
                      <option value="tourist">Foreign Tourist</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">Primary Document Type:</label>
                  <select
                    value={formData.docType}
                    onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
                    className="w-full p-2 border border-[#0A0A0C]/20 outline-none"
                  >
                    <option>National Identity Card (NIC)</option>
                    <option>Sri Lanka Driving License</option>
                    <option>Passport (Foreign Tourist)</option>
                    <option>International Driving Permit (AA Ceylon)</option>
                    <option>DMT Airport Temporary Driving Permit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">Document / ID Number:</label>
                  <input
                    type="text"
                    required
                    placeholder="NIC or Passport / Permit #"
                    value={formData.docNumber}
                    onChange={(e) => setFormData({ ...formData, docNumber: e.target.value })}
                    className="w-full p-2 border border-[#0A0A0C]/20 outline-none focus:border-[#FF4F00]"
                  />
                </div>

                <div>
                  <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">Stated Address / Hotel:</label>
                  <input
                    type="text"
                    placeholder="Residential address or hotel name"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2 border border-[#0A0A0C]/20 outline-none"
                  />
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
                    Create Profile
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
