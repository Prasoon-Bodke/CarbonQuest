/**
 * Centralized API Client for CarbonQuest Frontend.
 *
 * Responsibilities:
 * - Reads API base URL from NEXT_PUBLIC_API_BASE_URL (defaults to http://localhost:8000/api/v1).
 * - Guarantees consistent /api/v1 base path without duplication.
 * - Automatically injects Supabase Bearer JWT token from lib/supabase/client.
 * - Handles JSON serialization/deserialization.
 * - Handles structured HTTP errors, 401 Unauthenticated, 403 Consent Required, and network failures.
 * - Exposes typed request methods (get, post, put, patch, delete).
 */

import { getAuthToken, clearAuthToken } from "@/lib/supabase/client";
import type { ApiErrorEnvelope, ApiErrorDetail } from "@/types";

const RAW_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

// Ensure trailing slashes are removed
export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");

/**
 * Standardized API Error class for frontend error handling.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: ApiErrorDetail[];
  public readonly requestId?: string;

  constructor(
    message: string,
    status: number,
    code = "API_ERROR",
    details: ApiErrorDetail[] = [],
    requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  get isUnauthenticated(): boolean {
    return this.status === 401 || this.code === "UNAUTHENTICATED";
  }

  get isConsentRequired(): boolean {
    return this.status === 403 || this.code === "CONSENT_REQUIRED";
  }

  get isValidationError(): boolean {
    return this.status === 422 || this.code === "VALIDATION_ERROR";
  }

  get isConflict(): boolean {
    return this.status === 409 || this.code === "CONFLICT";
  }

  get isNotFound(): boolean {
    return this.status === 404 || this.code === "NOT_FOUND";
  }

  get isNetworkError(): boolean {
    return this.status === 0 || this.code === "NETWORK_ERROR";
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  token?: string | null;
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Core fetch wrapper with authentication injection and error normalization.
 */
export async function apiClient<T>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { token, params, headers, body, ...customConfig } = options;

  // Normalize path: allow '/me', 'me', '/api/v1/me'
  let cleanEndpoint = endpoint.trim();
  if (cleanEndpoint.startsWith(API_BASE_URL)) {
    cleanEndpoint = cleanEndpoint.slice(API_BASE_URL.length);
  } else if (cleanEndpoint.startsWith("/api/v1")) {
    cleanEndpoint = cleanEndpoint.slice("/api/v1".length);
  } else if (cleanEndpoint.startsWith("api/v1")) {
    cleanEndpoint = cleanEndpoint.slice("api/v1".length);
  }
  if (!cleanEndpoint.startsWith("/")) {
    cleanEndpoint = `/${cleanEndpoint}`;
  }

  let fullUrl = `${API_BASE_URL}${cleanEndpoint}`;

  // Query parameter serialization
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl += (fullUrl.includes("?") ? "&" : "?") + queryString;
    }
  }

  // Header construction
  const resolvedToken = token !== undefined ? token : getAuthToken();
  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (resolvedToken) {
    requestHeaders["Authorization"] = `Bearer ${resolvedToken}`;
  }

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...customConfig,
      headers: {
        ...requestHeaders,
        ...(headers as Record<string, string>),
      },
      body:
        body !== undefined
          ? body instanceof FormData
            ? body
            : JSON.stringify(body)
          : undefined,
    });
  } catch (networkError: unknown) {
    const msg =
      networkError instanceof Error ? networkError.message : "Network failure";
    throw new ApiError(
      `Unable to reach CarbonQuest API (${fullUrl}). Please ensure the FastAPI backend is running. Details: ${msg}`,
      0,
      "NETWORK_ERROR"
    );
  }

  const requestId =
    response.headers.get("X-Request-ID") ||
    response.headers.get("x-request-id") ||
    undefined;

  // Handle successful 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  // Parse response body
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  let parsedData: any = null;
  try {
    if (isJson) {
      parsedData = await response.json();
    } else {
      parsedData = await response.text();
    }
  } catch {
    parsedData = null;
  }

  // Error envelope handling
  if (!response.ok) {
    let errorCode = `HTTP_${response.status}`;
    let errorMessage = `Request failed with status ${response.status}`;
    let errorDetails: ApiErrorDetail[] = [];
    let envelopeRequestId = requestId;

    if (parsedData && typeof parsedData === "object") {
      // Standard FastAPI AppError envelope: { error: { code, message, details, request_id } }
      if (parsedData.error) {
        const err = parsedData.error;
        errorCode = err.code || errorCode;
        errorMessage = err.message || errorMessage;
        errorDetails = Array.isArray(err.details) ? err.details : [];
        envelopeRequestId = err.request_id || envelopeRequestId;
      }
      // Pydantic default validation error: { detail: [ { loc, msg, type } ] }
      else if (Array.isArray(parsedData.detail)) {
        errorCode = "VALIDATION_ERROR";
        errorMessage = "Request validation failed";
        errorDetails = parsedData.detail.map((d: any) => ({
          field: Array.isArray(d.loc) ? d.loc.join(".") : String(d.loc || ""),
          issue: d.msg || "Invalid parameter",
        }));
      } else if (typeof parsedData.detail === "string") {
        errorMessage = parsedData.detail;
      }
    }

    // Special handling for 401 unauthenticated
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("carbonquest:unauthenticated", {
            detail: { status: 401, message: errorMessage },
          })
        );
      }
    }

    throw new ApiError(
      errorMessage,
      response.status,
      errorCode,
      errorDetails,
      envelopeRequestId
    );
  }

  return parsedData as T;
}

/**
 * Convenient typed REST helpers.
 */
export const http = {
  get: <T>(endpoint: string, options?: Omit<ApiFetchOptions, "method" | "body">) =>
    apiClient<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<ApiFetchOptions, "method" | "body">
  ) => apiClient<T>(endpoint, { ...options, method: "POST", body }),

  put: <T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<ApiFetchOptions, "method" | "body">
  ) => apiClient<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<ApiFetchOptions, "method" | "body">
  ) => apiClient<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T>(
    endpoint: string,
    options?: Omit<ApiFetchOptions, "method" | "body">
  ) => apiClient<T>(endpoint, { ...options, method: "DELETE" }),
};
