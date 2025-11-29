import axiosInstance from "@/helpers/axiosInstance";
import { Staff, StaffRole, PaginatedResponse } from "@/types/api";
import { getCurrentUser } from "@/services/auth";

export interface FetchStaffParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export type StaffRolesDropdown = Pick<StaffRole, "name" | "description" | "id">;

// 🔹 Fetch paginated staff list
export async function fetchStaff({
  page = 1,
  limit = 10,
  search,
  role,
}: FetchStaffParams): Promise<PaginatedResponse<Staff>> {
  const params = new URLSearchParams();
  params.append("page", page.toString());
  params.append("limit", limit.toString());
  if (search) params.append("search", search);
  if (role) params.append("role", role);

  const { data } = await axiosInstance.get(`/api/staff?${params.toString()}`);

  // ✅ Case 1: API returned plain array
  if (Array.isArray(data)) {
    return {
      success: true,
      data,
      meta: {
        page,
        limit,
        total: data.length,
        totalPages: 1,
      },
    };
  }

  // ✅ Case 2: API returned { data: [], meta }
  if (Array.isArray(data.data)) {
    return data;
  }

  throw new Error("Invalid staff API response format");
}

// 🔹 Fetch staff roles (for dropdowns)
export async function fetchStaffRolesDropdown(): Promise<StaffRolesDropdown[]> {
  const { data } = await axiosInstance.get("/api/staffRoles/dropdown");

  if (!data.success) {
    throw new Error(data.error || "Failed to fetch staff roles");
  }

  return data.data ?? [];
}

// 🔹 Fetch details of current staff (profile)
export async function fetchStaffDetails(): Promise<Staff | null> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      console.error("No user or user ID found:", user);
      return null;
    }

    console.log("Fetching staff details for user:", user.id);
    console.log("User object:", JSON.stringify(user, null, 2));

    const { data } = await axiosInstance.get(`/api/staff/${user.id}`);

    if (!data.success) {
      console.error("API error:", data.error);
      return null;
    }

    console.log("Staff profile fetched successfully:", data.data);
    return data.data;
  } catch (error) {
    console.error("Error fetching staff profile:", error);
    return null;
  }
}
