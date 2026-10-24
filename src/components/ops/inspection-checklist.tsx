"use client";

import { Checkbox } from "@/components/ui/field";
import { useWorkspace } from "@/lib/workspace";

/**
 * The inspection points from the tenant's config (`modules.rentals.inspectionPoints`),
 * as a checklist. Photos for each point come with file uploads (Phase 5).
 */
export function InspectionChecklist({ checked, onChange, required }: { checked: string[]; onChange: (points: string[]) => void; required: boolean }) {
  const { config } = useWorkspace();
  const points = config.modules.rentals.inspectionPoints;
  const toggle = (point: string, on: boolean) => onChange(on ? [...checked, point] : checked.filter((p) => p !== point));
  return (
    <fieldset className="space-y-2 border border-ink/15 bg-paper p-3">
      <legend className="px-1 text-[10px] font-bold tracking-wider text-muted uppercase">
        Inspection {required ? "(every point required)" : "(optional)"}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {points.map((point, index) => (
          <Checkbox key={point} label={`${String(index + 1).padStart(2, "0")} · ${point}`} checked={checked.includes(point)} onChange={(on) => toggle(point, on)} />
        ))}
      </div>
      <button type="button" className="text-[10px] font-bold text-brand underline" onClick={() => onChange(checked.length === points.length ? [] : [...points])}>
        {checked.length === points.length ? "Clear all" : "Check all"}
      </button>
    </fieldset>
  );
}
