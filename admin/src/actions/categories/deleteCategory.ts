"use server";

import { revalidatePath } from "next/cache";

import { apiGet, apiDelete } from "@/lib/api-server";
import { ServerActionResponse } from "@/types/server-action";
import { ApiResponse, Category } from "@/types/api";

export async function deleteCategory(
  categoryId: string
): Promise<ServerActionResponse> {
  try {
    // First fetch category to check if it exists and get image info
    const categoryResponse = await apiGet<ApiResponse<Category>>(`/api/categories/${categoryId}`);
    
    if (!categoryResponse.success) {
      console.error("Failed to fetch category for deletion:", categoryResponse.error);
      return { dbError: "Could not find the category to delete." };
    }

    const category = categoryResponse.data;
    const imageUrl = category?.image_url;

    // TODO: Implement image deletion from your storage solution
    if (imageUrl) {
      // Placeholder - implement your image deletion logic here
      console.log(`Image deletion not implemented yet: ${imageUrl}`);
    }

    // Delete the category
    const deleteResponse = await apiDelete<ApiResponse>(`/api/categories/${categoryId}`);

    if (!deleteResponse.success) {
      console.error("Database delete failed:", deleteResponse.error);
      return { dbError: deleteResponse.error || "Something went wrong. Could not delete the category." };
    }

    revalidatePath("/categories");
    return { success: true };
  } catch (error: any) {
    console.error("API request failed:", error);
    return { dbError: "Failed to connect to server. Please try again later." };
  }
}
