import axiosInstance, { serverAxiosInstance } from "@/helpers/axiosInstance";
import {
  Product,
  ProductDetails,
  PaginatedResponse,
} from "@/types/api";

export interface FetchProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  subcategory?: string;
  priceSort?: "lowest-first" | "highest-first";
  status?: "selling" | "out-of-stock";
  published?: boolean;
  dateSort?: string;
  productType?: string;
}

export async function fetchProducts({
  page = 1,
  limit = 10,
  search,
  category,
  subcategory,
  priceSort,
  status,
  published,
  dateSort,
  productType,
}: FetchProductsParams): Promise<{
  data: Product[];
  totalPages: number;
  currentPage: number;
  prevPage: number | null;
  nextPage: number | null;
  limit: number;
  totalItems: number;
}> {
  const params = new URLSearchParams();

  params.append('page', page.toString());
  params.append('limit', limit.toString());

  if (search) params.append('search', search);
  if (category) params.append('category', category);
  if (subcategory) params.append('subcategory', subcategory);
  if (priceSort) params.append('priceSort', priceSort);
  if (status) params.append('status', status);
  if (published !== undefined) params.append('published', published.toString());
  if (dateSort) params.append('dateSort', dateSort);
  if (productType) params.append('productType', productType);

  // Use serverAxiosInstance for server-side rendering (no auth token)
  // Use regular axiosInstance for client-side calls (with auth token)
  const axios = typeof window === 'undefined' ? serverAxiosInstance : axiosInstance;

  const { data } = await axios.get(`/api/products?${params.toString()}`);

  // Ensure data is properly serializable for SSR
  return JSON.parse(JSON.stringify(data));
}

export async function fetchProductDetails({ slug }: { slug: string }): Promise<{ product: ProductDetails }> {
  try {
    console.log('🔍 Fetching product details for slug:', slug);

    // For server-side rendering, we need to ensure we're using the correct axios instance
    // and handle potential environment differences
    const axios = typeof window === 'undefined' ? serverAxiosInstance : axiosInstance;

    // Add a small delay for SSR to avoid potential timing issues
    if (typeof window === 'undefined') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const { data } = await axios.get(`/api/products/slug/${encodeURIComponent(slug)}`);
    console.log('✅ Product details fetched successfully for slug:', slug);

    // Ensure data is properly serializable for SSR
    const serializableProduct = data.data ? JSON.parse(JSON.stringify(data.data)) : null;

    return { product: serializableProduct };
  } catch (error: any) {
    console.error('❌ Error fetching product details:', error);
    console.error('❌ Request URL:', `/api/products/slug/${encodeURIComponent(slug)}`);
    console.error('❌ Response status:', error.response?.status);
    console.error('❌ Response data:', error.response?.data);
    console.error('❌ Is server-side:', typeof window === 'undefined');
    throw error;
  }
}

export async function fetchProductsDropdown(): Promise<Array<{ id: string; name: string; sku: string }>> {
  try {
    const response = await fetchProducts({ limit: 1000 }); // Get a large number to ensure all products
    return response.data.map(product => ({
      id: product._id,
      name: product.name,
      sku: product.sku
    }));
  } catch (error) {
    console.error('Error fetching products for dropdown:', error);
    return [];
  }
}
