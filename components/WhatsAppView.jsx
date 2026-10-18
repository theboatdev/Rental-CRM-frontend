'use client';

import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Copy, ExternalLink, MessageSquare, Check, Send } from 'lucide-react';

export default function WhatsAppView() {
  const { vehicles, rentals, payments, costs } = useStore();
  const [recipientNumber, setRecipientNumber] = useState('+94771234567');
  const [copied, setCopied] = useState(false);

  const activeRentals = rentals.filter((r) => r.status === 'ACTIVE');
  const rentedCount = vehicles.filter((v) => v.status === 'RENTED').length;
  const availableCount = vehicles.filter((v) => v.status === 'AVAILABLE').length;
  const maintenanceCount = vehicles.filter((v) => v.status === 'MAINTENANCE').length;
  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalCosts = costs.reduce((sum, c) => sum + Number(c.amount), 0);
  const netProfit = totalRevenue - totalCosts;

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const messageText = `*SHENALY RENT A CAR — WEEKLY FLEET & FINANCIAL DIGEST*
*Date:* ${today}
*Operations Center:* Colombo, Sri Lanka

━━━━━━━━━━━━━━━━━━━━
*FLEET UTILIZATION METRICS:*
• Total Registered Fleet: ${vehicles.length} Units
• Active On Road: ${rentedCount} Vehicles
• Available in Yard: ${availableCount} Vehicles
• Scheduled Workshop: ${maintenanceCount} Units

*7-DAY REVENUE & MARGIN BREAKDOWN:*
• Gross Rental Revenue: LKR ${totalRevenue.toLocaleString()}
• Operational Expenses & Bills: LKR ${totalCosts.toLocaleString()}
• *Net Fleet Profit: LKR ${netProfit.toLocaleString()}*

*ACTIVE RENTAL CONTRACTS (${activeRentals.length}):*
${activeRentals.map((r) => `• ${r.vehiclePlate} (${r.renterName}) | Due: ${r.endDate} | LKR ${r.totalAmount.toLocaleString()}`).join('\n')}

*COMPLIANCE & WORKSHOP WATCHLIST:*
• WP ND-5509 (Toyota KDH): Overhaul in progress at Toyota Lanka Wattala.
• David Miller (SR-0147): BIA Airport DMT driving permit validated.

━━━━━━━━━━━━━━━━━━━━
_Automated Dispatch Engine — Shenaly Rent a Car Operations_`;

  const cleanNumber = recipientNumber.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(messageText)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border border-[#0A0A0C]/15 bg-white p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[10px] font-mono tracking-widest text-[#FF4F00] uppercase font-bold">
            <span className="w-1.5 h-1.5 bg-[#FF4F00] inline-block"></span>
            <span>META CLOUD API // WHATSAPP AUTOMATION</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-[#0A0A0C] mt-1">
            Weekly Fleet Performance & Owner Digest
          </h2>
          <p className="text-xs font-mono text-[#6E7381] mt-1">
            Scheduled automated compile every Monday at 08:00 AM SLST (+05:30) for business owners and fleet executives.
          </p>
        </div>

        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 border border-[#0A0A0C]/20 hover:border-[#FF4F00] hover:bg-[#FFF5F0] text-[#0A0A0C] hover:text-[#FF4F00] font-bold uppercase transition-colors flex items-center space-x-1.5"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY RAW TEXT'}</span>
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 bg-[#FF4F00] hover:bg-[#E04500] text-white font-bold uppercase tracking-wider transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <Send size={14} />
            <span>DISPATCH TO WHATSAPP</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Terminal/Chat Preview in Swiss Grid Style */}
        <div className="lg:col-span-7 border border-[#0A0A0C]/15 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#0A0A0C]/10 text-xs font-mono">
            <span className="font-bold text-[#0A0A0C] uppercase tracking-wider">
              Simulated Message Payload
            </span>
            <span className="text-[10px] text-[#FF4F00] bg-[#FFF5F0] border border-[#FF4F00]/20 px-2 py-0.5">
              FORMAT: WHATSAPP CLOUD API V19.0
            </span>
          </div>

          <div className="p-4 bg-[#F8F8F9] border border-[#0A0A0C]/10 font-mono text-xs leading-relaxed text-[#0A0A0C] whitespace-pre-wrap select-all">
            {messageText}
          </div>

          <p className="text-[11px] font-mono text-[#6E7381]">
            Note: In production deployment, messages are pushed directly to verified WhatsApp Business numbers using webhooks without requiring manual intervention.
          </p>
        </div>

        {/* Dispatch Parameters */}
        <div className="lg:col-span-5 border border-[#0A0A0C]/15 bg-white p-6 space-y-5 font-mono text-xs">
          <div className="flex items-center space-x-2 pb-3 border-b border-[#0A0A0C]/10 font-bold uppercase tracking-wider text-[#0A0A0C]">
            <span className="w-2 h-2 bg-[#FF4F00]"></span>
            <span>Automation Configuration</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">
                Recipient Business WhatsApp Number:
              </label>
              <input
                type="text"
                value={recipientNumber}
                onChange={(e) => setRecipientNumber(e.target.value)}
                className="w-full p-2.5 border border-[#0A0A0C]/20 outline-none focus:border-[#FF4F00]"
              />
            </div>

            <div>
              <label className="block text-[#6E7381] uppercase text-[10px] font-bold mb-1">
                Trigger Cadence:
              </label>
              <input
                type="text"
                disabled
                value="Every Monday at 08:00 AM SLST"
                className="w-full p-2 bg-[#F8F8F9] border border-[#0A0A0C]/10 text-[#6E7381]"
              />
            </div>

            <div className="pt-3 border-t border-[#0A0A0C]/10 space-y-2 text-[#0A0A0C]">
              <span className="text-[10px] text-[#6E7381] uppercase block font-bold">
                Included Performance Modules:
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-[#FF4F00]"></span>
                  <span>Real-time fleet utilization breakdown</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-[#FF4F00]"></span>
                  <span>7-Day gross collection vs workshop expense</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-[#FF4F00]"></span>
                  <span>Net fleet profit margin in LKR</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-[#FF4F00]"></span>
                  <span>Tourist DMT permit compliance & return watchlist</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
