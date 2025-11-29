import axiosInstance from "@/helpers/axiosInstance";
import {
  Category,
  CategoryDropdown,
  PaginatedResponse,
} from "@/types/api";

export interface FetchCategoriesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export async function fetchCategories({
  page = 1,
  limit = 10,
  search,
}: FetchCategoriesParams): Promise<PaginatedResponse<Category>> {
  const params = new URLSearchParams();
  
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  if (search) params.append('search', search);

  const { data } = await axiosInstance.get(`/api/categories?${params.toString()}`);
  
  // Ensure each category has both _id and id fields for compatibility
  if (data.data) {
    data.data = data.data.map((category: any) => ({
      ...category,
      id: category._id, // Ensure id field exists for table compatibility
      // Ensure subcategories are properly formatted
      subcategories: category.subcategories || [],
    }));
  }
  
  return data;
}

export async function fetchCategoriesDropdown(): Promise<CategoryDropdown[]> {
  const { data } = await axiosInstance.get('/api/categories/dropdown');

  if (!data.success) {
    console.error('Error fetching categories:', data.error);
    throw new Error(data.error || 'Failed to fetch categories');
  }

  return data.data ?? [];
}

export async function fetchSubcategoriesByCategorySlug(categorySlug: string): Promise<any[]> {
  if (!categorySlug || categorySlug === "all") {
    return [];
  }

  try {
    // First get the category by slug to get its ID
    const categoryResponse = await axiosInstance.get(`/api/categories/dropdown`);
    if (!categoryResponse.data.success) {
      throw new Error('Failed to fetch categories');
    }

    const category = categoryResponse.data.data.find((cat: any) => cat.slug === categorySlug);
    if (!category) {
      console.warn(`Category with slug "${categorySlug}" not found`);
      return [];
    }

    // Now fetch subcategories using the category ID
    const { data } = await axiosInstance.get(`/api/categories/${category._id}`);

    if (!data.success) {
      console.error('Error fetching subcategories:', data.error);
      throw new Error(data.error || 'Failed to fetch subcategories');
    }

    return data.data.subcategories ?? [];
  } catch (error) {
    console.error('Error in fetchSubcategoriesByCategorySlug:', error);
    return [];
  }
}
