import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
  isFormData?: boolean; // 👈 added flag
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, isFormData = false } = options;

  const cookieStore = cookies();
  const token = cookieStore.get("authToken")?.value;

  const config: RequestInit = {
    method,
    headers: {
      ...headers,
    },
  };

  // Add auth token if available
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  // If body is FormData → don't set Content-Type (browser sets it automatically)
  if (body && method !== "GET") {
    if (isFormData) {
      config.body = body;
    } else {
      config.headers = {
        "Content-Type": "application/json",
        ...config.headers,
      };
      config.body = JSON.stringify(body);
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${method} ${url}`, error);
    throw error;
  }
}

// Convenience wrappers
export const apiGet = <T = any>(endpoint: string, headers?: Record<string, string>) =>
  apiRequest<T>(endpoint, { method: "GET", headers });

export const apiPost = <T = any>(
  endpoint: string,
  body?: any,
  headers?: Record<string, string>,
  isFormData = false
) => apiRequest<T>(endpoint, { method: "POST", body, headers, isFormData });

export const apiPut = <T = any>(
  endpoint: string,
  body?: any,
  headers?: Record<string, string>,
  isFormData = false
) => apiRequest<T>(endpoint, { method: "PUT", body, headers, isFormData });

export const apiDelete = <T = any>(endpoint: string, headers?: Record<string, string>, body?: any) =>
  apiRequest<T>(endpoint, { method: "DELETE", headers, body });
