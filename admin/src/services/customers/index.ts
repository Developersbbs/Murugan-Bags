import axiosInstance from "@/helpers/axiosInstance";
import {
  Customer,
  PaginatedResponse,
} from "@/types/api";

interface WishlistItem {
  _id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  price: number;
  discounted_price?: number;
  created_at: string;
}

interface CartItem {
  _id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  price: number;
  discounted_price?: number;
  quantity: number;
  variant?: {
    name: string;
    value: string;
  };
}

interface CartData {
  items: CartItem[];
  totalItems: number;
  cartTotal: number;
}

export interface FetchCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
}

export async function fetchCustomers({
  page = 1,
  limit = 10,
  search,
}: FetchCustomersParams): Promise<PaginatedResponse<Customer>> {
  const params = new URLSearchParams();
  
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  if (search) params.append('search', search);

  const { data } = await axiosInstance.get(`/api/customers?${params.toString()}`);
  
  // Ensure each customer has both _id and id fields for compatibility
  if (data.data) {
    data.data = data.data.map((customer: any) => ({
      ...customer,
      id: customer._id, // Ensure id field exists for table compatibility
    }));
  }
  
  return data;
}

export interface CustomerDetails extends Customer {
  statistics?: {
    total_orders: number;
    total_spent: number;
    last_order: string | null;
    order_statuses: Record<string, number>;
  };
  orders: any[];
  wishlist: {
    total_items: number;
    items: any[];
  };
}

export async function fetchCustomerDetails(id: string): Promise<{ customer: CustomerDetails }> {
  const { data } = await axiosInstance.get(`/api/customers/${id}`);
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch customer details');
  }

  return {
    customer: {
      ...data.data,
      id: data.data._id || data.data.id, // Ensure id field exists
    },
  };
}

export async function fetchCustomerOrders({ id }: { id: string }) {
  const { data } = await axiosInstance.get(`/api/customers/${id}/orders`);
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch customer orders');
  }

  return {
    customerOrders: data.data,
  };
}

export async function fetchCustomerWishlist(customerId: string): Promise<{ items: WishlistItem[], totalItems: number }> {
  const { data } = await axiosInstance.get(`/api/customers/${customerId}/wishlist`);
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch wishlist');
  }

  return {
    items: data.data.items || [],
    totalItems: data.data.totalItems || 0
  };
}

export async function fetchCustomerCart(customerId: string): Promise<CartData> {
  const { data } = await axiosInstance.get(`/api/customers/${customerId}/cart`);
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch cart');
  }

  return {
    items: data.data.items || [],
    totalItems: data.data.totalItems || 0,
    cartTotal: data.data.cartTotal || 0
  };
}
