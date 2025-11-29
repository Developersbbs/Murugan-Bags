import { Pagination } from "@/types/pagination";
import { Product, ProductDetails } from "@/types/api";

export type ProductStatus = "selling" | "out-of-stock";

// Re-export types from API types for compatibility
export type { Product, ProductDetails };

export interface FetchProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  priceSort?: string;
  status?: string;
  published?: boolean;
  dateSort?: string;
}

export interface FetchProductsResponse {
  data: Product[];
  pagination: Pagination;
}
