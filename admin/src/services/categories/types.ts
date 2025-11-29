import { Pagination } from "@/types/pagination";
import { Category, CategoryDropdown } from "@/types/api";

// Re-export types from API types for compatibility
export type { Category, CategoryDropdown };

export interface FetchCategoriesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface FetchCategoriesResponse {
  data: Category[];
  pagination: Pagination;
}
