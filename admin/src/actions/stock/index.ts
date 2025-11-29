import { ServerActionResponse } from "@/types/server-action";
import { serverAxiosInstance } from "@/helpers/axiosInstance";

export interface Product {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  image_url?: string[];
  product_variants?: Array<{
    _id: string;
    slug: string;
    name?: string;
    sku?: string;
    image_url?: string[];
    images?: string[];
    attributes?: Record<string, string>;
  }>;
}

export interface Stock {
  _id: string;
  productId: {
    _id: string;
    name: string;
    slug: string;
    sku: string;
    image_url?: string[];
    product_variants?: Array<{
      _id: string;
      slug: string;
      name?: string;
      sku?: string;
      image_url?: string[];
      images?: string[];
      attributes?: Record<string, string>;
    }>;
  } | null;
  variantId?: string;
  quantity: number;
  minStock: number;
  notes: string;
  
  created_at: string;
  updated_at: string;
}

export interface StockResponse {
  data: Stock[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
  limit: number;
  prevPage?: number | null;
  nextPage?: number | null;
}
export interface StockFilters {
  productId?: string;
  variantId?: string;
  lowStock?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

// Fetch all stock entries
export async function fetchStock(filters: StockFilters = {}): Promise<StockResponse> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });

  try {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/stock?${params}`;
    console.log('Fetching stock from:', url);
    
    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to fetch stock data' }));
      console.error('Error fetching stock:', errorData);
      throw new Error(errorData.error || `Failed to fetch stock: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Stock API response:', result);

    // Ensure we return a proper response structure even if backend returns unexpected format
    if (!result || typeof result !== 'object') {
      console.error('Invalid response format from server:', result);
      throw new Error('Invalid response format from server');
    }

    // If the API doesn't include image_url or variant details, we need to fetch it from products
    if (result.data && result.data.length > 0) {
      // Get unique product IDs, filtering out null productId
      const productIds = Array.from(new Set(
        result.data
          .filter((stock: Stock): stock is Stock & { productId: NonNullable<Stock['productId']> } => 
            stock.productId !== null && stock.productId._id !== undefined
          )
          .map((stock: Stock) => stock.productId!._id) // Safe to use ! after filter
      ));

      // Only fetch products if we have valid product IDs
      if (productIds.length > 0) {
        // Fetch products to get image_url and variant details
        const productsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products?ids=${productIds.join(',')}&limit=1000`, {
          credentials: 'include',
        });

        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          const productsMap = new Map(productsData.data.map((product: any) => [product._id, product]));

          // Merge image_url and variant details into stock data
          result.data = result.data.map((stock: Stock) => {
            // Only process if productId exists
            if (!stock.productId || !stock.productId._id) {
              return stock; // Return stock as-is if no productId
            }

            const product = productsMap.get(stock.productId._id);

          // Preserve existing variant data if it exists, otherwise use from products API
          const existingVariants = stock.productId.product_variants || [];
          const productVariants = (product as Product)?.product_variants || [];

          // Merge variant data, preserving existing images
          const mergedVariants = existingVariants.length > 0
            ? existingVariants.map(existingVariant => {
                const productVariant = productVariants.find(v => v._id === existingVariant._id);
                return {
                  ...existingVariant,
                  // Keep existing images, but add from products API if missing
                  image_url: existingVariant.image_url || (existingVariant as any).images || productVariant?.image_url || [],
                };
              })
            : productVariants.map(variant => ({
                ...variant,
                image_url: variant.image_url || (variant as any).images || [],
              }));

          return {
            ...stock,
            productId: {
              ...stock.productId,
              image_url: (product as Product)?.image_url || stock.productId.image_url || [],
              product_variants: mergedVariants,
            },
          };
        });
      }
      }
    }

    return result as StockResponse;
  } catch (error: any) {
    console.error('Error fetching stock:', error);

    // If it's a network error or parsing error, throw it
    if (error.message?.includes('fetch') || error.message?.includes('Invalid response')) {
      throw error;
    }

    // For other errors, return an empty response instead of throwing
    // This ensures the UI shows "no data" instead of an error
    return {
      data: [],
      totalPages: 0,
      currentPage: 1,
      totalItems: 0,
      limit: filters.limit || 10,
      prevPage: null,
      nextPage: null,
    };
  }
}

// Fetch single stock entry
export async function fetchStockById(id: string): Promise<Stock> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock/${id}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch stock: ${response.statusText}`);
  }

  return response.json();
}

// Create new stock entry
export async function createStock(stockData: Omit<Stock, '_id' | 'created_at' | 'updated_at'>): Promise<Stock> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(stockData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to create stock: ${response.statusText}`);
  }

  return response.json();
}

// Update stock entry
export async function updateStock(id: string, stockData: Partial<Stock>): Promise<Stock> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(stockData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to update stock: ${response.statusText}`);
  }

  return response.json();
}

// Delete stock entry
export async function deleteStock(id: string): Promise<ServerActionResponse> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { dbError: errorData.error || `Failed to delete stock: ${response.statusText}` };
    }

    const result = await response.json();
    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error in deleteStock:", error);
    return { dbError: error.message || "An unexpected error occurred." };
  }
}

// Bulk update stock entries
export async function bulkUpdateStock(updates: Array<{ id: string; quantity: number; notes?: string }>): Promise<{ message: string; updated: number }> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock/bulk-update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ updates }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Failed to bulk update stock: ${response.statusText}`);
  }

  return response.json();
}

// Export stock data
export async function exportStock() {
  try {
    const { data } = await serverAxiosInstance.get("/api/stock/export");

    if (!data.success) {
      console.error("API export failed:", data.error);
      return { error: data.error || "Failed to fetch data for stock." };
    }

    return { data: data.data };
  } catch (error: any) {
    console.error("Stock export error:", error);
    return {
      error: error.response?.data?.error || "Failed to fetch data for stock."
    };
  }
}
