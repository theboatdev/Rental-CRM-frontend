import { AlertTriangle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type { ApiError } from "@/lib/api";

/** The heading of every page: an orange eyebrow line, a title, and actions on the right. */
export function PageHeader({ eyebrow, title, actions }: { eyebrow: string; title: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-center">
      <div>
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-widest text-brand uppercase">
          <span className="inline-block size-1.5 bg-brand" />
          <span>{eyebrow}</span>
        </div>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-ink">{title}</h2>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, actions, children, className = "" }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`border border-ink/15 bg-panel ${className}`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <h3 className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-ink uppercase">
            <span className="inline-block size-2 bg-brand" />
            {title}
          </h3>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 p-6 font-mono text-xs text-muted" role="status">
      <Loader2 size={14} className="animate-spin" />
      {label}…
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="p-6 text-center font-mono text-xs text-muted italic">{children}</p>;
}

/** An API error, with its field issues when there are any. */
export function ErrorNote({ error, className = "" }: { error: ApiError | Error | null | undefined; className?: string }) {
  if (!error) return null;
  const issues = "issues" in error ? error.issues : [];
  return (
    <div role="alert" className={`flex gap-2 border border-rose-300 bg-rose-50 p-3 font-mono text-xs text-rose-900 ${className}`}>
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-bold">{error.message}</p>
        {issues.length > 0 && (
          <ul className="mt-1 list-inside list-disc">
            {issues.map((issue) => (
              <li key={`${issue.path}:${issue.message}`}>
                {issue.path ? `${issue.path}: ` : ""}
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const TONES = {
  neutral: "border-ink/15 bg-paper text-ink",
  brand: "border-brand/30 bg-brand/10 text-brand",
  green: "border-emerald-300 bg-emerald-50 text-emerald-800",
  amber: "border-amber-300 bg-amber-50 text-amber-900",
  rose: "border-rose-300 bg-rose-50 text-rose-800",
  violet: "border-violet-300 bg-violet-50 text-violet-900",
  muted: "border-ink/10 bg-panel text-muted",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-block border px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider whitespace-nowrap uppercase ${TONES[tone]}`}>{children}</span>;
}

/** A key figure: a small label over a large value, with an optional note. */
export function Stat({ label, value, note, tone = "ink" }: { label: string; value: ReactNode; note?: ReactNode; tone?: "ink" | "green" | "rose" | "amber" | "brand" }) {
  const color = { ink: "text-ink", green: "text-emerald-700", rose: "text-rose-700", amber: "text-amber-700", brand: "text-brand" }[tone];
  return (
    <div className="border border-ink/15 bg-panel p-4">
      <p className="font-mono text-[10px] font-bold tracking-wider text-muted uppercase">{label}</p>
      <p className={`mt-2 font-mono text-xl font-black sm:text-2xl ${color}`}>{value}</p>
      {note && <div className="mt-1 font-mono text-[10px] text-muted">{note}</div>}
    </div>
  );
}

/** Table header and cell classes, so every table looks the same. */
export const table = {
  wrap: "overflow-x-auto",
  table: "min-w-full font-mono text-xs",
  head: "border-b border-line bg-[#F8F8F9] text-left text-[10px] tracking-wider text-muted uppercase",
  th: "px-4 py-3 font-semibold whitespace-nowrap",
  row: "border-b border-line last:border-0 hover:bg-paper",
  td: "px-4 py-3 align-top",
};
