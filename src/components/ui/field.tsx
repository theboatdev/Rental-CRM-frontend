import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const control = "min-h-10 w-full rounded-md border border-line bg-panel px-3 py-2 font-sans text-base text-ink placeholder:text-muted/70 sm:text-sm disabled:bg-paper disabled:text-muted";

/**
 * A labelled form control with an optional hint and error. `children` gets
 * the generated id, so the label stays tied to its control.
 */
export function Field({
  label,
  error,
  hint,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink">
        {label}
      </label>
      {children(id)}
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = ({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) => <input className={`${control} ${className}`} {...props} />;

export const Select = ({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={`${control} ${className}`} {...props} />;

export const Textarea = ({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={`${control} min-h-16 ${className}`} {...props} />
);

/** A checkbox with its label on the right. */
export function Checkbox({ label, checked, onChange, disabled }: { label: ReactNode; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-2 text-xs ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/** Parses a number input's value; empty stays undefined so optional fields can be left out. */
export const numberOrUndefined = (value: string) => (value.trim() === "" ? undefined : Number(value));
