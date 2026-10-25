import { AlertTriangle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type { ApiError } from "@/lib/api";

/** A consistent title, supporting context and page actions. */
export function PageHeader({ eyebrow, title, actions }: { eyebrow: string; title: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-4 pb-1 sm:flex-row sm:items-end">
      <div>
        <div className="text-sm text-muted">
          <span>{eyebrow}</span>
        </div>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, actions, children, className = "" }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-lg border border-line bg-panel ${className}`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
          <h3 className="text-sm font-semibold text-ink">
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
    <div className="flex items-center gap-2 p-6 text-sm text-muted" role="status">
      <Loader2 size={14} className="animate-spin" />
      {label}…
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-6 py-12 text-center text-sm leading-relaxed text-muted">{children}</p>;
}

/** An API error, with its field issues when there are any. */
export function ErrorNote({ error, className = "" }: { error: ApiError | Error | null | undefined; className?: string }) {
  if (!error) return null;
  const issues = "issues" in error ? error.issues : [];
  return (
    <div role="alert" className={`flex gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 ${className}`}>
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">{error.message}</p>
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
  neutral: "border-line bg-paper text-ink",
  brand: "border-line bg-paper text-ink",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  rose: "border-rose-200 bg-rose-50 text-rose-800",
  violet: "border-violet-200 bg-violet-50 text-violet-900",
  muted: "border-ink/10 bg-panel text-muted",
} as const;

export type Tone = keyof typeof TONES;

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONES[tone]}`}>{children}</span>;
}

/** A key figure: a small label over a large value, with an optional note. */
export function Stat({ label, value, note, tone = "ink" }: { label: string; value: ReactNode; note?: ReactNode; tone?: "ink" | "green" | "rose" | "amber" | "brand" }) {
  const color = { ink: "text-ink", green: "text-emerald-700", rose: "text-rose-700", amber: "text-amber-700", brand: "text-brand" }[tone];
  return (
    <div className="min-w-0 rounded-lg border border-line bg-panel p-5">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={`mt-3 break-words text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl ${color}`}>{value}</p>
      {note && <div className="mt-2 text-xs text-muted">{note}</div>}
    </div>
  );
}

/** Table header and cell classes, so every table looks the same. */
export const table = {
  wrap: "overflow-x-auto",
  table: "min-w-full text-sm tabular-nums",
  head: "border-b border-line bg-paper/70 text-left text-xs text-muted",
  th: "px-5 py-3 font-medium whitespace-nowrap",
  row: "border-b border-line last:border-0 hover:bg-paper/60",
  td: "px-5 py-4 align-top",
};
