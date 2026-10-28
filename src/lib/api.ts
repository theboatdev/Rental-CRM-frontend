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

/**
 * Calls the tenant API with the signed-in user's session token. The token
 * carries their active organization, which is how the backend knows the tenant.
 */
export function useApiRequest(): ApiRequest {
  const { getToken } = useAuth();
  return useCallback(
    async <T,>(method: HttpMethod, path: string, body?: unknown): Promise<T> => {
      const token = await getToken();
      let res: Response;
      try {
        res = await fetch(`${API_URL}${path}`, {
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
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const error = data?.error;
        throw new ApiError(error?.message ?? `The server returned ${res.status}`, res.status, error?.code ?? "internal", error?.issues ?? []);
      }
      return data as T;
    },
    [getToken],
  );
}
