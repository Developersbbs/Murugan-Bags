import { Pagination } from "@/types/pagination";
import { Staff, StaffRole } from "@/types/api";

export type StaffStatus = "active" | "inactive";

// Re-export types from API types for compatibility
export type { Staff };

export interface FetchStaffParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

export interface FetchStaffResponse {
  data: Staff[];
  pagination: Pagination;
}

export type StaffRolesDropdown = Pick<StaffRole, "name" | "description">;
