import { Pagination } from "@/types/pagination";
import { Customer, Order } from "@/types/api";

// Re-export types from API types for compatibility
export type { Customer };

export interface FetchCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface FetchCustomersResponse {
  data: Customer[];
  pagination: Pagination;
}

export type CustomerOrder = Pick<
  Order,
  | "id"
  | "total_amount"
  | "status"
  | "created_at"
> & {
  invoice_no: string;
  order_time: string | Date;
  payment_method: string;
  customer?: Pick<Customer, "name" | "address" | "phone">;
  customers?: Pick<Customer, "name" | "address" | "phone">;
};
