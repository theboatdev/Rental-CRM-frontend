"use client";

import { Camera, CheckCircle2, FileText, Loader2, Paperclip, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import type { FileView, UploadedFile } from "@/lib/contract";

const formatBytes = (bytes: number) => (bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/**
 * Counts the uploads still running in a form, so its submit button can wait
 * for them: a record sent mid-upload would be saved without its file.
 */
export function useUploadsInFlight() {
  const [count, setCount] = useState(0);
  const onBusy = useCallback((busy: boolean) => setCount((current) => Math.max(0, current + (busy ? 1 : -1))), []);
  return { uploading: count > 0, onBusy };
}

/**
 * Picks a file and uploads it at once with `upload` (e.g. useFileUpload),
 * then hands the upload to `onChange`. With `photo`, phones open the camera
 * and the picked image shows as a thumbnail.
 */
export function FilePicker({
  label,
  upload,
  value,
  onChange,
  onBusy,
  accept,
  photo = false,
  required = false,
  hint,
  error,
  compact = false,
}: {
  label: string;
  upload: (file: File) => Promise<UploadedFile>;
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  onBusy?: (busy: boolean) => void;
  accept: string;
  photo?: boolean;
  required?: boolean;
  hint?: string;
  error?: string;
  compact?: boolean;
}) {
  const id = useId();
  const [status, setStatus] = useState<{ uploading: boolean; name?: string; failure?: string }>({ uploading: false });
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setStatus({ uploading: true, name: file.name });
    onBusy?.(true);
    try {
      onChange(await upload(file));
      setStatus({ uploading: false, name: file.name });
      if (photo) setPreview(URL.createObjectURL(file));
    } catch (failure) {
      setStatus({ uploading: false, failure: failure instanceof Error ? failure.message : "The upload failed" });
    } finally {
      onBusy?.(false);
    }
  };
  const clear = () => {
    onChange(null);
    setPreview(null);
    setStatus({ uploading: false });
  };
  const Icon = photo ? Camera : Paperclip;

  return (
    <div>
      {!compact && (
        <p className="mb-1.5 block text-xs font-medium text-ink">
          {label}
          {required && <span className="text-rose-700"> *</span>}
        </p>
      )}
      {value ? (
        <div className="flex min-h-10 items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50/60 px-3 py-1.5 text-xs text-emerald-900">
          {preview ? (
            // A local object URL of the picked photo.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-8 shrink-0 rounded object-cover" />
          ) : (
            <CheckCircle2 size={14} className="shrink-0" />
          )}
          <span className="min-w-0 flex-1 truncate">
            {status.name ?? "Uploaded"} · {formatBytes(value.bytes)}
          </span>
          <button type="button" onClick={clear} className="flex shrink-0 items-center gap-0.5 font-semibold text-muted hover:text-ink" aria-label={`Remove ${label}`}>
            <X size={12} /> Remove
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={`flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed px-3 py-1.5 text-xs font-medium ${error ? "border-rose-400 text-rose-800" : "border-line text-ink hover:border-ink/40 hover:bg-paper"} ${status.uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          {status.uploading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
          {status.uploading ? `Uploading ${status.name ?? ""}…` : compact ? label : photo ? "Take or choose a photo" : "Choose a file"}
          <input id={id} type="file" className="sr-only" accept={accept} {...(photo ? { capture: "environment" as const } : {})} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      )}
      {status.failure && (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-700">
          {status.failure}
        </p>
      )}
      {error && !status.failure && (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}
      {hint && !error && !status.failure && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Opens a stored file in a new tab. Links expire after 10 minutes, so they're always taken from fresh data. */
export function FileLink({ file, label = "View" }: { file: FileView | null; label?: string }) {
  if (!file) return null;
  const kind = file.format.toUpperCase();
  if (!file.url) return <span className="text-xs text-muted">{kind} on file</span>;
  return (
    <a href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand underline">
      <FileText size={12} /> {label} ({kind})
    </a>
  );
}

/** A photo thumbnail that opens the full photo. */
export function PhotoThumb({ file, alt }: { file: FileView | null; alt: string }) {
  if (!file?.url) return null;
  return (
    <a href={file.url} target="_blank" rel="noopener noreferrer" title={alt} className="block overflow-hidden rounded border border-line">
      {/* An expiring Cloudinary link, which next/image can't optimize. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={file.url} alt={alt} className="aspect-square w-full object-cover" loading="lazy" />
    </a>
  );
}
