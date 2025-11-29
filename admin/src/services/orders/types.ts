import { Pagination } from "@/types/pagination";
import { Order, OrderItem, Customer, Product, Coupon } from "@/types/api";

export type OrderStatus = 'pending' | 'processing' | 'dispatched' | 'shipped' | 'delivered' | 'cancelled';
export type OrderMethod = 'cash' | 'card' | 'credit';

// Re-export types from API types for compatibility
export type { Order };

export interface FetchOrdersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  method?: string;
  startDate?: string;
  endDate?: string;
}

export interface FetchOrdersResponse {
  data: Order[];
  pagination: Pagination;
}

export type OrderDetails = Pick<
  Order,
  | "id"
  | "total_amount"
  | "status"
  | "created_at"
> & {
  customer?: Pick<Customer, "name" | "email" | "phone" | "address">;
  order_items?: (Pick<OrderItem, "quantity" | "unit_price"> & {
    product?: Pick<Product, "name">;
  })[];
  coupon?: Pick<Coupon, "discount_type" | "discount_value"> | null;
};

export type OrdersExport = {
  id: string;
  invoice_no?: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  discount: string;
  shipping_cost: number;
  payment_method: string;
  order_time: string;
  status: string;
  created_at: string;
  updated_at: string;
};
