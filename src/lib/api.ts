"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import type { ApiIssue } from "./contract";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1").replace(/\/+$/, "");

/** An error response from the tenant API: `{ error: { code, message, issues? } }`. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly issues: ApiIssue[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** The message for one field, e.g. issueFor("startDate"). */
  issueFor(path: string): string | undefined {
    return this.issues.find((issue) => issue.path === path)?.message;
  }
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type ApiRequest = <T>(method: HttpMethod, path: string, body?: unknown) => Promise<T>;

/** Sends a request to the tenant API with `token`, turning a network failure into an ApiError. */
async function send(token: string | null, method: HttpMethod, path: string, body?: unknown): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "content-type": "application/json" }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(`Can't reach the server at ${API_URL}. Check that the backend is running.`, 0, "unreachable");
  }
}

/** The ApiError an unsuccessful response describes. */
async function errorOf(res: Response) {
  const error = (await res.json().catch(() => null))?.error;
  return new ApiError(error?.message ?? `The server returned ${res.status}`, res.status, error?.code ?? "internal", error?.issues ?? []);
}

/**
 * Calls the tenant API with the signed-in user's session token. The token
 * carries their active organization, which is how the backend knows the tenant.
 */
export function useApiRequest(): ApiRequest {
  const { getToken } = useAuth();
  return useCallback(
    async <T,>(method: HttpMethod, path: string, body?: unknown): Promise<T> => {
      const res = await send(await getToken(), method, path, body);
      if (!res.ok) throw await errorOf(res);
      return (await res.json().catch(() => null)) as T;
    },
    [getToken],
  );
}

/**
 * Downloads a file the tenant API makes (GET `path`), such as a PDF, and
 * saves it as `filename`. The request needs the session token, so a plain
 * link can't do it.
 */
export function useApiDownload() {
  const { getToken } = useAuth();
  return useCallback(
    async (path: string, filename: string) => {
      const res = await send(await getToken(), "GET", path);
      if (!res.ok) throw await errorOf(res);
      const url = URL.createObjectURL(await res.blob());
      const link = Object.assign(document.createElement("a"), { href: url, download: filename });
      document.body.append(link);
      link.click();
      link.remove();
      // Give the browser a moment to start the download before the URL goes.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    },
    [getToken],
  );
}
