"use client";

import { Check, Copy, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ModuleGate } from "@/components/shell/module-gate";
import { Button } from "@/components/ui/button";
import { Badge, ErrorNote, Loading, PageHeader, Panel, type Tone } from "@/components/ui/page";
import type { DigestRun, WhatsAppDigest } from "@/lib/contract";
import { useDigest, useTenantMutation } from "@/lib/queries";
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

const RUN_STATUS: Record<DigestRun["status"], { label: string; tone: Tone }> = {
  sending: { label: "Sending", tone: "muted" },
  sent: { label: "Sent", tone: "green" },
  partial: { label: "Partly sent", tone: "amber" },
  failed: { label: "Failed", tone: "rose" },
};

/**
 * The weekly digest as it's sent, built by the backend from live data. Once
 * the platform team connects the workspace's WhatsApp Business number, the
 * backend sends it on the schedule; members with whatsapp:manage can also
 * send it now. It can always be copied or opened in WhatsApp by hand.
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
        title="Fleet digest"
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
          <Panel title="Message preview" className="lg:col-span-7" actions={<span className="font-sans text-xs text-muted">Built {format.dateTime(data.generatedAt)}</span>}>
            <pre className="m-5 border border-line bg-[#F8F8F9] rounded-md p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap select-all">{data.message}</pre>
            {!data.includesFinancials && <p className="mx-5 mb-5 font-sans text-xs text-muted">Money figures are left out because your role doesn&apos;t include financials.</p>}
          </Panel>
          <Panel title="Delivery" className="lg:col-span-5">
            <div className="space-y-4 p-5 font-sans text-xs">
              <div>
                <p className="text-xs font-semibold text-muted">Schedule</p>
                <p className="mt-1 font-semibold">
                  {describeCron(data.cron)} ({data.timezone})
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted">Recipients</p>
                {data.recipients.length === 0 ? (
                  <p className="mt-1 text-muted">None set yet. The platform team adds them to your configuration.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {data.recipients.map((number) => (
                      <li key={number} className="flex items-center justify-between gap-2 border border-line p-2">
                        <span>{number}</span>
                        <a href={waLink(number)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold text-brand underline">
                          <Send size={12} /> Open in WhatsApp
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <a href={waLink()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 bg-brand px-4 py-2.5 font-semibold tracking-normal text-white hover:brightness-95">
                <Send size={14} /> Share in WhatsApp
              </a>
              <AutomaticDelivery digest={data} />
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

function AutomaticDelivery({ digest }: { digest: WhatsAppDigest }) {
  const { can, format } = useWorkspace();
  const send = useTenantMutation((request) => request<DigestRun>("POST", "/whatsapp/digest/send"));
  const delivery = digest.delivery;
  if (!delivery) return null;

  return (
    <div className="space-y-3 border-t border-line pt-4">
      <p className="text-xs font-semibold text-muted">Automatic sending</p>
      {delivery.connected ? (
        <p>
          Sent on the schedule from your WhatsApp Business number
          {delivery.mode === "template" ? ", as your approved message template." : ", as plain text."}
          {delivery.mode === "text" && (
            <span className="mt-1 block text-muted">
              WhatsApp only delivers plain text to people who wrote to your number in the last 24 hours. For reliable weekly delivery, ask the platform team to add an approved template.
            </span>
          )}
        </p>
      ) : (
        <p className="text-muted">Not connected yet. The platform team connects your WhatsApp Business number; until then, open the message in WhatsApp and send it.</p>
      )}
      {can("whatsapp:manage") && delivery.connected && (
        <Button
          variant="outline"
          disabled={send.isPending || digest.recipients.length === 0}
          onClick={() =>
            send.mutate(undefined, {
              onSuccess: (run) => (run.status === "sent" ? toast.success("Digest sent") : toast.error(`${RUN_STATUS[run.status].label}: ${run.error ?? "see below"}`)),
            })
          }
        >
          <Send size={14} /> {send.isPending ? "Sending…" : "Send now"}
        </Button>
      )}
      <ErrorNote error={send.error} />
      {delivery.runs.length > 0 && (
        <ul className="space-y-2">
          {delivery.runs.map((run) => (
            <li key={run.id} className="space-y-1 border border-line p-2">
              <div className="flex items-center justify-between gap-2">
                <span>
                  {format.dateTime(run.startedAt)} · {run.trigger === "schedule" ? "on schedule" : `by ${run.by?.name ?? "hand"}`}
                </span>
                <Badge tone={RUN_STATUS[run.status].tone}>{RUN_STATUS[run.status].label}</Badge>
              </div>
              {run.error && <p className="text-rose-700">{run.error}</p>}
              {run.results
                .filter((result) => !result.ok)
                .map((result) => (
                  <p key={result.to} className="text-rose-700">
                    {result.to}: {result.error}
                  </p>
                ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
