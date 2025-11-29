import { Pagination } from "@/types/pagination";
import { Coupon } from "@/types/api";

export type CouponStatus = "expired" | "active";

// Re-export types from API types for compatibility
export type { Coupon };

export interface FetchCouponsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface FetchCouponsResponse {
  data: Coupon[];
  pagination: Pagination;
}
