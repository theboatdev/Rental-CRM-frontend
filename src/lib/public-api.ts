"use client";

import { API_URL, ApiError } from "./api";
import type { UploadSignature, UploadedFile } from "./contract";
import { sendToCloudinary } from "./uploads";

/** The guest portal API sits next to the tenant API on the backend: …/api/v1 → …/api/public. */
const PUBLIC_URL = API_URL.replace(/\/v1$/, "/public");

/** Calls the guest portal API. No session: these routes are public and rate-limited by the backend. */
export async function publicRequest<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${PUBLIC_URL}${path}`, {
      method,
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Can't reach the booking service. Check your connection and try again.", 0, "unreachable");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = data?.error;
    throw new ApiError(error?.message ?? `The server returned ${res.status}`, res.status, error?.code ?? "internal", error?.issues ?? []);
  }
  return data as T;
}

/** Uploads a guest's document scan: signed by the portal, then sent to Cloudinary. */
export async function uploadGuestDocument(slug: string, file: File): Promise<UploadedFile> {
  const signed = await publicRequest<UploadSignature>("POST", `/${encodeURIComponent(slug)}/uploads`, { kind: "document" });
  return (await sendToCloudinary(signed, file)).file;
}
