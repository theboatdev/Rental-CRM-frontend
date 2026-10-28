"use client";

import { useCallback } from "react";
import { useApiRequest } from "./api";
import type { FileKind, UploadSignature, UploadedFile } from "./contract";

/**
 * Files go from the browser straight to Cloudinary: the backend signs the
 * upload (POST /uploads), the file is posted with those fields, and the
 * response goes back to the API with the record, which checks it.
 */

/** Posts `file` to Cloudinary with signed fields. `secureUrl` is only usable for public files, such as a logo. */
export async function sendToCloudinary(signed: UploadSignature, file: File): Promise<{ file: UploadedFile; secureUrl: string }> {
  const form = new FormData();
  for (const [key, value] of Object.entries(signed.fields)) form.append(key, String(value));
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(signed.uploadUrl, { method: "POST", body: form });
  } catch {
    throw new Error("Couldn't reach the file storage. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.message ?? `The upload failed (${res.status})`);
  return {
    file: { publicId: data.public_id, version: data.version, signature: data.signature, format: data.format, bytes: data.bytes, resourceType: data.resource_type },
    secureUrl: data.secure_url,
  };
}

/** Uploads a file of `kind` for a tenant API record: signs it, then sends it to Cloudinary. */
export function useFileUpload(kind: FileKind) {
  const request = useApiRequest();
  return useCallback(async (file: File) => (await sendToCloudinary(await request<UploadSignature>("POST", "/uploads", { kind }), file)).file, [request, kind]);
}

export const DOCUMENT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
export const PHOTO_ACCEPT = "image/*";
