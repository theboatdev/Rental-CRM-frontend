"use client";

import { Check, Copy, Send } from "lucide-react";
import { useState } from "react";
import { ModuleGate } from "@/components/shell/module-gate";
import { Button } from "@/components/ui/button";
import { ErrorNote, Loading, PageHeader, Panel } from "@/components/ui/page";
import { useDigest } from "@/lib/queries";
import { useWorkspace } from "@/lib/workspace";

export default function WhatsAppPage() {
  return (
    <ModuleGate module="whatsappDigest" permission="whatsapp:view">
      <Digest />
    </ModuleGate>
  );
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "Every Monday at 08:00" for the weekly and daily cron shapes the digest uses; the raw expression otherwise. */
function describeCron(cron: string) {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = cron.split(/\s+/);
  const time = /^\d+$/.test(minute) && /^\d+$/.test(hour) ? `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}` : null;
  if (!time || dayOfMonth !== "*" || month !== "*") return cron;
  if (dayOfWeek === "*") return `Every day at ${time}`;
  return /^[0-6]$/.test(dayOfWeek) ? `Every ${DAYS[Number(dayOfWeek)]} at ${time}` : cron;
}

/**
 * The weekly digest as it would be sent, built by the backend from live data.
 * Scheduled sending through the WhatsApp Cloud API comes in Phase 5; until then
 * it can be copied or opened in WhatsApp for each recipient.
 */
function Digest() {
  const { format } = useWorkspace();
  const digest = useDigest();
  const [copied, setCopied] = useState(false);
  const data = digest.data;

  const copy = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const waLink = (number?: string) => `https://wa.me/${number ? number.replace(/[^0-9]/g, "") : ""}?text=${encodeURIComponent(data?.message ?? "")}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="WhatsApp digest"
        title="Weekly fleet digest for management"
        actions={
          data && (
            <Button variant="outline" onClick={copy}>
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy text"}
            </Button>
          )
        }
      />
      {digest.isPending && <Loading />}
      <ErrorNote error={digest.error} />
      {data && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Panel title="Message preview" className="lg:col-span-7" actions={<span className="font-mono text-[10px] text-muted">Built {format.dateTime(data.generatedAt)}</span>}>
            <pre className="m-5 border border-line bg-[#F8F8F9] p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap select-all">{data.message}</pre>
            {!data.includesFinancials && <p className="mx-5 mb-5 font-mono text-[11px] text-muted">Money figures are left out because your role doesn&apos;t include financials.</p>}
          </Panel>
          <Panel title="Delivery" className="lg:col-span-5">
            <div className="space-y-4 p-5 font-mono text-xs">
              <div>
                <p className="text-[10px] font-bold text-muted uppercase">Schedule</p>
                <p className="mt-1 font-bold">
                  {describeCron(data.cron)} ({data.timezone})
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted uppercase">Recipients</p>
                {data.recipients.length === 0 ? (
                  <p className="mt-1 text-muted">None set yet. The platform team adds them to your configuration.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {data.recipients.map((number) => (
                      <li key={number} className="flex items-center justify-between gap-2 border border-line p-2">
                        <span>{number}</span>
                        <a href={waLink(number)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-bold text-brand underline">
                          <Send size={12} /> Open in WhatsApp
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <a href={waLink()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 bg-brand px-4 py-2.5 font-bold tracking-wider text-white uppercase hover:brightness-95">
                <Send size={14} /> Share in WhatsApp
              </a>
              <p className="text-[11px] text-muted">Automatic sending on the schedule is coming. For now, open the message in WhatsApp and send it.</p>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
