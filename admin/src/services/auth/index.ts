import axiosInstance from "@/helpers/axiosInstance";
import {
  LoginRequest,
  LoginResponse,
  User,
  ApiResponse,
} from "@/types/api";

export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export async function signIn({ email, password }: LoginRequest): Promise<LoginResponse> {
  try {
    const { data } = await axiosInstance.post<ApiResponse<LoginResponse>>("/api/auth/login", {
      email,
      password,
    });

    if (!data.success) {
      throw new Error(data.error || "Login failed");
    }

    // Store token in localStorage and cookie
    if (data.data?.token) {
      localStorage.setItem("authToken", data.data.token);
      // Set cookie for middleware
      document.cookie = `authToken=${data.data.token}; path=/; max-age=604800; SameSite=strict`; // 7 days
    }

    return data.data!;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || "Login failed");
  }
}

export async function signUp({ name, email, password, role = "staff" }: SignUpRequest): Promise<LoginResponse> {
  try {
    const { data } = await axiosInstance.post<ApiResponse<LoginResponse>>("/api/auth/register", {
      name,
      email,
      password,
      role,
    });

    if (!data.success) {
      throw new Error(data.error || "Sign up failed");
    }

    // Store token in localStorage and cookie
    if (data.data?.token) {
      localStorage.setItem("authToken", data.data.token);
      // Set cookie for middleware
      document.cookie = `authToken=${data.data.token}; path=/; max-age=604800; SameSite=strict`; // 7 days
    }
    return data.data!;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || "Sign up failed");
  }
}

export async function signOut(): Promise<void> {
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      await axiosInstance.post("/api/auth/logout");
    }
  } catch (error) {
    // Even if logout API fails, we should still clear local storage
    console.error("Logout API failed:", error);
  } finally {
    // Always remove token from localStorage and cookie (only in browser)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  }
}

export async function getCurrentUser(): Promise<User> {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('getCurrentUser can only be called on the client side');
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    console.log("getCurrentUser: Token from localStorage:", token.substring(0, 50) + "...");

    console.log("getCurrentUser: Making API call to /api/auth/me");
    const { data } = await axiosInstance.get<ApiResponse<User>>("/api/auth/me");
    console.log("getCurrentUser: API response:", data);

    if (!data.success) {
      throw new Error(data.error || "Failed to fetch user");
    }

    console.log("getCurrentUser: User data:", data.data);
    console.log("getCurrentUser: User ID:", data.data?.id);
    console.log("getCurrentUser: User _id:", data.data?._id);

    return data.data!;
  } catch (error: any) {
    console.error("getCurrentUser: Error:", error);
    throw new Error(error.response?.data?.error || error.message || "Failed to fetch user");
  }
}

export async function updatePassword({ currentPassword, newPassword }: UpdatePasswordRequest): Promise<void> {
  try {
    const { data } = await axiosInstance.put<ApiResponse>("/api/auth/update-password", {
      currentPassword,
      newPassword,
    });

    if (!data.success) {
      throw new Error(data.error || "Failed to update password");
    }
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || "Failed to update password");
  }
}

export async function resetPassword({ email }: ResetPasswordRequest): Promise<void> {
  try {
    const { data } = await axiosInstance.post<ApiResponse>("/api/auth/forgot-password", {
      email,
    });

    if (!data.success) {
      throw new Error(data.error || "Failed to send reset email");
    }
  } catch (error: any) {
    throw new Error(error.response?.data?.error || error.message || "Failed to send reset email");
  }
}

export function isAuthenticated(): boolean {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return false;
  }

  // Check both localStorage and cookies for token
  const localToken = localStorage.getItem("authToken");
  const cookieToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('authToken='))
    ?.split('=')[1];

  return !!(localToken || cookieToken);
}

export function getAuthToken(): string | null {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem("authToken");
}
