"use client";

import { FilePicker } from "@/components/ops/files";
import { Checkbox } from "@/components/ui/field";
import type { UploadedFile } from "@/lib/contract";
import { PHOTO_ACCEPT, useFileUpload } from "@/lib/uploads";
import { useWorkspace } from "@/lib/workspace";

/** The photo taken of each inspection point, by point. */
export type InspectionPhotos = Record<string, UploadedFile>;

/** The photos in the shape the check-in and return endpoints take. */
export const photosPayload = (photos: InspectionPhotos) => Object.entries(photos).map(([point, file]) => ({ point, file }));

/**
 * The inspection points from the tenant's config (`modules.rentals.inspectionPoints`),
 * as a checklist with a photo for each point. A photo checks its point.
 */
export function InspectionChecklist({
  checked,
  onChange,
  photos,
  onPhotosChange,
  onBusy,
  required,
}: {
  checked: string[];
  onChange: (points: string[]) => void;
  photos: InspectionPhotos;
  onPhotosChange: (photos: InspectionPhotos) => void;
  onBusy: (busy: boolean) => void;
  required: boolean;
}) {
  const { config } = useWorkspace();
  const upload = useFileUpload("inspection");
  const points = config.modules.rentals.inspectionPoints;
  const isChecked = (point: string) => checked.includes(point) || Boolean(photos[point]);
  const toggle = (point: string, on: boolean) => onChange(on ? [...checked, point] : checked.filter((p) => p !== point));
  const setPhoto = (point: string, file: UploadedFile | null) => {
    const next = { ...photos };
    if (file) next[point] = file;
    else delete next[point];
    onPhotosChange(next);
    if (file && !checked.includes(point)) onChange([...checked, point]);
  };

  return (
    <fieldset className="space-y-2 border border-ink/15 bg-paper p-3">
      <legend className="px-1 text-xs font-semibold tracking-normal text-muted">
        Inspection {required ? "(every point required)" : "(optional)"} · photos optional
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {points.map((point, index) => (
          <div key={point} className="flex items-center justify-between gap-2 border border-line bg-panel p-2">
            <Checkbox
              label={`${String(index + 1).padStart(2, "0")} · ${point}`}
              checked={isChecked(point)}
              disabled={Boolean(photos[point])}
              onChange={(on) => toggle(point, on)}
            />
            <div className="w-40 shrink-0">
              <FilePicker compact photo label="Photo" upload={upload} value={photos[point] ?? null} onChange={(file) => setPhoto(point, file)} onBusy={onBusy} accept={PHOTO_ACCEPT} />
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="text-xs font-semibold text-brand underline" onClick={() => onChange(checked.length === points.length ? [] : [...points])}>
        {checked.length === points.length ? "Clear all" : "Check all"}
      </button>
    </fieldset>
  );
}
