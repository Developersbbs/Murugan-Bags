import { cookies } from "next/headers";
import { apiGet } from "@/lib/api-server";
import { User, ApiResponse } from "@/types/api";

/**
 * getUser - Function to retrieve user information from MongoDB backend.
 * @returns A Promise that resolves to the user data.
 */
export async function getUser(): Promise<User | null> {
  try {
    // Check if user has auth token in cookies
    const cookieStore = cookies();
    const token = cookieStore.get('authToken')?.value;
    
    if (!token) {
      return null;
    }

    // Call our MongoDB API to get current user
    const response = await apiGet<ApiResponse<User>>('/api/auth/me');
    
    if (!response.success || !response.data) {
      return null;
    }

    return response.data;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
}
