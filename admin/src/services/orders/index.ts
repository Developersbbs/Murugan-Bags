// ===== services/orders.ts =====
import axiosInstance from "@/helpers/axiosInstance";
import { Order, OrderDetails } from "@/types/api";

export interface FetchOrdersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  method?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  items: T[];
  pagination: {
    total: number;
    current: number;
    limit: number;
    pages: number;
    prev: number | null;
    next: number | null;
  };
}

// Type guard to validate array
function isValidItemsArray(items: any): items is Order[] {
  return Array.isArray(items) && items.every((item: any) => 
    item && typeof item === 'object' && 
    (item.id || item._id) // Basic validation that items look like orders
  );
}

// Fetch paginated orders with bulletproof error handling
export async function fetchOrders(params: FetchOrdersParams): Promise<PaginatedResponse<Order>> {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) query.append(key, value.toString());
    });

    console.log('🚀 API Request:', `/api/orders?${query.toString()}`);
    
    const response = await axiosInstance.get(`/api/orders?${query.toString()}`);
    const { data } = response;

    console.log('📦 Raw API Response:', {
      status: response.status,
      data: data,
      dataType: typeof data,
      dataKeys: data ? Object.keys(data) : null
    });

    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response: not an object');
    }

    if (data.success === false) {
      throw new Error(data.error || 'API request failed');
    }

    // Extract and validate items
    let items: Order[] = [];
    
    if (data.items === null || data.items === undefined) {
      console.warn('⚠️ API returned null/undefined items, using empty array');
      items = [];
    } else if (!Array.isArray(data.items)) {
      console.error('❌ API returned non-array items:', {
        items: data.items,
        type: typeof data.items,
        constructor: data.items?.constructor?.name
      });
      throw new Error(`Expected items to be array, got ${typeof data.items}`);
    } else if (!isValidItemsArray(data.items)) {
      console.error('❌ Items array contains invalid data:', data.items);
      // Filter out invalid items instead of throwing
      items = data.items.filter((item: any) => 
        item && typeof item === 'object' && (item.id || item._id)
      );
      console.log('🔧 Filtered to valid items:', items.length);
    } else {
      items = data.items;
    }

    // Validate pagination
    const defaultPagination = {
      total: 0,
      current: params.page || 1,
      limit: params.limit || 10,
      pages: 0,
      prev: null,
      next: null,
    };

    const pagination = data.pagination && typeof data.pagination === 'object' 
      ? { ...defaultPagination, ...data.pagination }
      : defaultPagination;

    const result: PaginatedResponse<Order> = {
      success: true,
      items,
      pagination,
    };

    console.log('✅ Final result:', {
      success: result.success,
      itemsCount: result.items.length,
      itemsIsArray: Array.isArray(result.items),
      pagination: result.pagination
    });

    return result;

  } catch (error: any) {
    console.error('💥 fetchOrders error:', error);
    
    // Always return a valid structure even on error
    const fallbackResult: PaginatedResponse<Order> = {
      success: false,
      items: [],
      pagination: {
        total: 0,
        current: params.page || 1,
        limit: params.limit || 10,
        pages: 0,
        prev: null,
        next: null,
      },
    };

    // Log error details but don't break the app
    if (error.response) {
      console.error('🔴 API Error Response:', error.response.data);
      console.error('🔴 API Error Status:', error.response.status);
    }

    // Re-throw for React Query to handle
    throw error;
  }
}

// Fetch single order with enhanced error handling
export async function fetchOrderDetails({ id }: { id: string }): Promise<{ order: OrderDetails }> {
  try {
    console.log('🚀 Fetching order details for:', id);
    
    const { data } = await axiosInstance.get(`/api/orders/${id}`);
    
    console.log('📦 Order details response:', data);
    
    if (!data || !data.success) {
      throw new Error(data?.error || "Failed to fetch order details");
    }

    if (!data.data) {
      throw new Error("Order data not found in response");
    }

    return { order: data.data as OrderDetails };

  } catch (error: any) {
    console.error('💥 fetchOrderDetails error:', error);
    throw error;
  }
} 